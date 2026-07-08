import {
  BadRequestException,
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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  type CreateEmployeeInput,
  createEmployeeSchema,
  type UpdateEmployeeInput,
  updateEmployeeSchema,
} from '@barbearia/schemas';
import { Prisma } from '@prisma/client';

import { PlanLimitsService } from '../billing/plan-limits.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { resolveBarbershopId } from '../tenancy/resolve-barbershop';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly planLimits: PlanLimitsService) {}

  private async requireTenant(ctx: TenantContextValue): Promise<string> {
    if (!ctx.tenantId) {
      throw new BadRequestException('Header X-Tenant-Id obrigatório.');
    }
    return ctx.tenantId;
  }

  @Get()
  @ApiQuery({ name: 'barbershopId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async list(
    @Tx() ctx: TenantContextValue,
    @Query('barbershopId') barbershopId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    await this.requireTenant(ctx);
    const shopId = await resolveBarbershopId(ctx, barbershopId);
    const showInactive = includeInactive === 'true' || includeInactive === '1';
    return ctx.tx.employee.findMany({
      where: {
        barbershopId: shopId,
        ...(showInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    });
  }

  @Get(':id')
  async get(@Tx() ctx: TenantContextValue, @Param('id', ParseUUIDPipe) id: string) {
    await this.requireTenant(ctx);
    const employee = await ctx.tx.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    return employee;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(createEmployeeSchema)) body: CreateEmployeeInput,
    @Query('barbershopId') barbershopId?: string,
  ) {
    const tenantId = await this.requireTenant(ctx);
    const shopId = await resolveBarbershopId(ctx, barbershopId);
    await this.planLimits.assertCanAddEmployee(ctx.tx, tenantId, shopId);

    return ctx.tx.employee.create({
      data: {
        tenantId,
        barbershopId: shopId,
        displayName: body.displayName,
        email: body.email ?? null,
        role: body.role,
        isActive: body.isActive,
      },
    });
  }

  @Patch(':id')
  async update(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) body: UpdateEmployeeInput,
  ) {
    await this.requireTenant(ctx);

    const existing = await ctx.tx.employee.findUnique({
      where: { id },
      select: { id: true, isActive: true, tenantId: true, barbershopId: true },
    });
    if (!existing) throw new NotFoundException('Funcionário não encontrado.');

    // Reativar conta contra o teto do plano — senão desativa/reativa fura o limite.
    if (body.isActive === true && !existing.isActive) {
      await this.planLimits.assertCanAddEmployee(ctx.tx, existing.tenantId, existing.barbershopId);
    }

    try {
      return await ctx.tx.employee.update({
        where: { id },
        data: {
          ...(body.displayName !== undefined && { displayName: body.displayName }),
          ...(body.email !== undefined && { email: body.email ?? null }),
          ...(body.role !== undefined && { role: body.role }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ForbiddenException('Acesso negado.');
      }
      throw err;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.requireTenant(ctx);
    try {
      await ctx.tx.employee.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Funcionário não encontrado.');
      }
      throw err;
    }
  }
}
