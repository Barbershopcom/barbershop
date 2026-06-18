import { createHmac } from 'node:crypto';

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EmailService } from '../email/email.service';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

const CreateEmployeeSchema = z.object({
  displayName: z.string().min(1, 'Nome obrigatório').max(100),
  email: z.string().email().optional(),
  role: z.enum(['barber', 'admin', 'admin_barber']),
});
type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  isActive: z.boolean().optional(),
});
type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

interface EmployeeResponseDto {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Employees API — CRUD de funcionários (barbeiros/admin).
 * Só admin/admin_barber. Tenant via @Tx (RLS); role validado em requireAdmin.
 *
 * Workflow de onboarding: admin cria (appUserId=null) → email de convite com
 * token HMAC assinado → barbeiro aceita e vincula AppUser.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/employees')
export class AdminEmployeesController {
  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private async requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: user.id },
      select: { tenantId: true, role: true },
    });
    if (!employee) throw new ForbiddenException('Usuário não vinculado.');
    if (employee.role !== 'admin' && employee.role !== 'admin_barber') {
      throw new ForbiddenException('Apenas admin pode gerenciar funcionários.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return { tenantId: employee.tenantId };
  }

  /** Token de convite HMAC-assinado ({employeeId, tenantId, exp} base64url). */
  private buildOnboardingToken(employeeId: string, tenantId: string): string {
    const secret =
      this.config.get<string>('APPOINTMENT_CANCEL_SECRET') ?? 'dev-secret';
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 dias
    const payload = Buffer.from(
      JSON.stringify({ employeeId, tenantId, exp }),
      'utf8',
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const sig = createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${payload}.${sig}`;
  }

  @Get()
  @ApiOperation({ summary: 'Listar funcionários (ativos/inativos) do tenant.' })
  @ApiOkResponse({ description: 'Lista de funcionários' })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  @ApiForbiddenResponse({ description: 'Usuário sem role admin' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EmployeeResponseDto[]> {
    await this.requireAdmin(ctx, user);
    const employees = await ctx.tx.employee.findMany({
      orderBy: { displayName: 'asc' },
    });
    return employees.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar funcionário e enviar convite por email.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['displayName', 'role'],
      properties: {
        displayName: { type: 'string', example: 'João Silva' },
        email: { type: 'string', example: 'joao@email.com' },
        role: { type: 'string', enum: ['barber', 'admin', 'admin_barber'] },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Funcionário criado, convite enviado' })
  @ApiBadRequestResponse({ description: 'Validação falhou (ex: email duplicado)' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) body: CreateEmployeeInput,
  ): Promise<EmployeeResponseDto> {
    const admin = await this.requireAdmin(ctx, user);

    if (body.email) {
      const dup = await ctx.tx.employee.findFirst({
        where: { email: body.email },
        select: { id: true },
      });
      if (dup) throw new ForbiddenException('Já existe um funcionário com esse email.');
    }

    const barbershop = await ctx.tx.barbershop.findFirst({ select: { id: true } });
    if (!barbershop) throw new NotFoundException('Barbearia não encontrada.');

    const employee = await ctx.tx.employee.create({
      data: {
        tenantId: admin.tenantId,
        barbershopId: barbershop.id,
        appUserId: null,
        isActive: true,
        displayName: body.displayName,
        email: body.email ?? null,
        role: body.role,
      },
    });

    if (employee.email) {
      console.log('📨 [AdminEmployeesController] Enviando convite para:', employee.email);
      const tenant = await ctx.tx.tenant.findUnique({
        where: { id: admin.tenantId },
        select: { name: true },
      });
      const onboardingToken = this.buildOnboardingToken(employee.id, admin.tenantId);
      void this.email.sendEmployeeInvite({
        to: employee.email,
        employeeName: employee.displayName,
        tenantName: tenant?.name ?? 'Barbearia',
        onboardingToken,
      });
    } else {
      console.log('⚠️ [AdminEmployeesController] Sem email fornecido, convite não enviado');
    }

    return toDto(employee);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar funcionário (campos opcionais).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Funcionário atualizado' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateEmployeeSchema)) body: UpdateEmployeeInput,
  ): Promise<EmployeeResponseDto> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.employee.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Funcionário não encontrado.');

    const employee = await ctx.tx.employee.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.email !== undefined && { email: body.email ?? null }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return toDto(employee);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar funcionário (irreversível).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  async delete(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.employee.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Funcionário não encontrado.');

    await ctx.tx.employee.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}): EmployeeResponseDto {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
