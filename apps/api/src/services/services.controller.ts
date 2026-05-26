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
  type CreateServiceInput,
  createServiceSchema,
  type UpdateServiceInput,
  updateServiceSchema,
} from '@barbearia/schemas';
import { Prisma } from '@prisma/client';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * CRUD de serviços. Toda rota exige X-Tenant-Id no header pra o
 * TenantInterceptor setar app.tenant_id e ativar RLS.
 */
@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  private async requireTenant(ctx: TenantContextValue): Promise<string> {
    if (!ctx.tenantId) {
      throw new BadRequestException('Header X-Tenant-Id obrigatório.');
    }
    return ctx.tenantId;
  }

  /**
   * Resolve a barbershop. Sprint 1: 1 tenant = 1 barbershop, então pegamos a
   * primeira (e única) automaticamente se barbershopId não for passado.
   * Quando suportarmos multi-unidade, o caller passa explicitamente.
   */
  private async resolveBarbershopId(
    ctx: TenantContextValue,
    explicit?: string,
  ): Promise<string> {
    if (explicit) {
      const found = await ctx.tx.barbershop.findUnique({
        where: { id: explicit },
        select: { id: true },
      });
      if (!found) throw new NotFoundException('Barbershop não encontrado.');
      return found.id;
    }
    const first = await ctx.tx.barbershop.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!first) {
      throw new BadRequestException(
        'Nenhuma barbershop nesse tenant. Complete o onboarding primeiro.',
      );
    }
    return first.id;
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
    const shopId = await this.resolveBarbershopId(ctx, barbershopId);
    const showInactive = includeInactive === 'true' || includeInactive === '1';
    return ctx.tx.service.findMany({
      where: {
        barbershopId: shopId,
        ...(showInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  @Get(':id')
  async get(@Tx() ctx: TenantContextValue, @Param('id', ParseUUIDPipe) id: string) {
    await this.requireTenant(ctx);
    const service = await ctx.tx.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    return service;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceInput,
    @Query('barbershopId') barbershopId?: string,
  ) {
    const tenantId = await this.requireTenant(ctx);
    const shopId = await this.resolveBarbershopId(ctx, barbershopId);

    return ctx.tx.service.create({
      data: {
        tenantId,
        barbershopId: shopId,
        name: body.name,
        description: body.description ?? null,
        durationMin: body.durationMin,
        bufferMin: body.bufferMin,
        basePriceCents: body.basePriceCents,
        isActive: body.isActive,
      },
    });
  }

  @Patch(':id')
  async update(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceInput,
  ) {
    await this.requireTenant(ctx);

    // Verifica existência (RLS já filtra por tenant)
    const existing = await ctx.tx.service.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Serviço não encontrado.');

    try {
      return await ctx.tx.service.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && {
            description: body.description ?? null,
          }),
          ...(body.durationMin !== undefined && { durationMin: body.durationMin }),
          ...(body.bufferMin !== undefined && { bufferMin: body.bufferMin }),
          ...(body.basePriceCents !== undefined && {
            basePriceCents: body.basePriceCents,
          }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ForbiddenException('Acesso negado ao serviço.');
      }
      throw err;
    }
  }

  /** Soft delete: marca is_active=false. Hard delete só por SQL direto. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.requireTenant(ctx);
    try {
      await ctx.tx.service.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Serviço não encontrado.');
      }
      throw err;
    }
  }
}
