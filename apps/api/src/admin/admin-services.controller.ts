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
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  type CreateServiceInput,
  createServiceSchema,
  type ServiceDto,
  type UpdateServiceInput,
  updateServiceSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Admin Services API — superfície canônica de escrita de serviços por tenant.
 * Só admin do tenant (assertTenantAdmin via tenant_memberships).
 * Validação vem do schema compartilhado @barbearia/schemas (fonte única).
 * Tenant via @Tx (RLS).
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
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'true/1 inclui serviços inativos. Default: só ativos.',
  })
  @ApiOkResponse({ description: 'Lista de serviços do tenant.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiForbiddenResponse({ description: 'Usuário sem permissão (role: admin)' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ServiceDto[]> {
    await this.requireAdmin(ctx, user);
    const showInactive = includeInactive === 'true' || includeInactive === '1';
    const services = await ctx.tx.service.findMany({
      where: showInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { basePriceCents: 'asc' }, { name: 'asc' }],
    });
    return services.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo serviço.' })
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
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Serviço criado com sucesso' })
  @ApiBadRequestResponse({ description: 'Campo inválido ou faltando' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceInput,
  ): Promise<ServiceDto> {
    const admin = await this.requireAdmin(ctx, user);

    const barbershop = await ctx.tx.barbershop.findFirst({ select: { id: true } });
    if (!barbershop) throw new NotFoundException('Barbearia não encontrada.');

    const service = await ctx.tx.service.create({
      data: {
        tenantId: admin.tenantId,
        barbershopId: barbershop.id,
        name: body.name,
        description: body.description ?? null,
        durationMin: body.durationMin,
        bufferMin: body.bufferMin,
        basePriceCents: body.basePriceCents,
        isActive: body.isActive,
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
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceInput,
  ): Promise<ServiceDto> {
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
  @ApiOperation({
    summary: 'Desativar serviço (soft delete — preserva histórico de agendamentos).',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Desativado com sucesso' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async deactivate(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.service.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Serviço não encontrado.');

    await ctx.tx.service.update({ where: { id }, data: { isActive: false } });
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
  barbershopId: string;
  createdAt: Date;
  updatedAt: Date;
}): ServiceDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMin: row.durationMin,
    bufferMin: row.bufferMin,
    basePriceCents: row.basePriceCents,
    isActive: row.isActive,
    barbershopId: row.barbershopId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
