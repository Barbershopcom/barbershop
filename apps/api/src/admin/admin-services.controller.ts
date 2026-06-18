import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().positive('Duração deve ser positiva'),
  bufferMin: z.number().int().nonnegative('Buffer não pode ser negativo').default(0),
  basePriceCents: z.number().int().positive('Preço deve ser positivo'),
});
type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

const UpdateServiceSchema = CreateServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});
type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

interface ServiceResponseDto {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  bufferMin: number;
  basePriceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Services API — CRUD de serviços por tenant. Só admin/admin_barber.
 * Tenant via @Tx (RLS); role validado em requireAdmin.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/services')
export class AdminServicesController {
  private requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    return assertTenantAdmin(ctx, user, 'gerenciar serviços');
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços do tenant' })
  @ApiOkResponse({ description: 'Lista de serviços (ativos e inativos).' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiForbiddenResponse({ description: 'Usuário sem permissão (role: admin)' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ServiceResponseDto[]> {
    await this.requireAdmin(ctx, user);
    const services = await ctx.tx.service.findMany({
      orderBy: [{ basePriceCents: 'asc' }, { name: 'asc' }],
    });
    return services.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo serviço (começa inativo).' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'durationMin', 'basePriceCents'],
      properties: {
        name: { type: 'string', example: 'Corte clássico' },
        description: { type: 'string', example: 'Corte com tesoura' },
        durationMin: { type: 'number', example: 30 },
        bufferMin: { type: 'number', example: 5 },
        basePriceCents: { type: 'number', example: 5000 },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Serviço criado com sucesso' })
  @ApiBadRequestResponse({ description: 'Campo inválido ou faltando' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateServiceSchema)) body: CreateServiceInput,
  ): Promise<ServiceResponseDto> {
    const admin = await this.requireAdmin(ctx, user);

    const barbershop = await ctx.tx.barbershop.findFirst({ select: { id: true } });
    if (!barbershop) throw new NotFoundException('Barbearia não encontrada.');

    const service = await ctx.tx.service.create({
      data: {
        tenantId: admin.tenantId,
        barbershopId: barbershop.id,
        isActive: false,
        name: body.name,
        description: body.description ?? null,
        durationMin: body.durationMin,
        bufferMin: body.bufferMin,
        basePriceCents: body.basePriceCents,
      },
    });
    return toDto(service);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar serviço (campos opcionais).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Serviço atualizado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateServiceSchema)) body: UpdateServiceInput,
  ): Promise<ServiceResponseDto> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.service.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Serviço não encontrado.');

    const service = await ctx.tx.service.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.durationMin !== undefined && { durationMin: body.durationMin }),
        ...(body.bufferMin !== undefined && { bufferMin: body.bufferMin }),
        ...(body.basePriceCents !== undefined && { basePriceCents: body.basePriceCents }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return toDto(service);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar serviço (irreversível).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async delete(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.service.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Serviço não encontrado.');

    await ctx.tx.service.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  bufferMin: number;
  basePriceCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ServiceResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMin: row.durationMin,
    bufferMin: row.bufferMin,
    basePriceCents: row.basePriceCents,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
