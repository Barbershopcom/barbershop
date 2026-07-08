import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateUnitInput,
  createUnitSchema,
  limitsForTier,
  type PlanTier,
  type UnitDto,
  type UnitsResponse,
  type UpdateUnitInput,
  updateUnitSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { PlanLimitsService } from '../billing/plan-limits.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

const unitSelect = {
  id: true,
  slug: true,
  name: true,
  isActive: true,
  location: { select: { addressLine1: true, city: true } },
  _count: { select: { employees: { where: { isActive: true } } } },
} as const;

type UnitRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  location: { addressLine1: string; city: string };
  _count: { employees: number };
};

function toUnitDto(row: UnitRow): UnitDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.isActive,
    addressLine1: row.location.addressLine1,
    city: row.location.city,
    employeeCount: row._count.employees,
  };
}

/**
 * Admin Units API — unidades (barbershops) do tenant (spec 2026-07-07).
 * Criar/reativar passa pelo teto de unidades do plano (PlanLimitsService).
 * NÃO cria tenant nem assinatura: a unidade nasce dentro do tenant atual.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/units')
export class AdminUnitsController {
  constructor(
    private readonly planLimits: PlanLimitsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Slug de unidade divide o namespace público com slugs de tenant (a rota
   * /b/:slug resolve os dois) — colisão com qualquer um é 409.
   *
   * Usa o PrismaService global (bypassa RLS de propósito): dentro da tx RLS,
   * tenants/barbershops de OUTROS donos são invisíveis e a colisão passaria.
   * É só checagem de existência de slug — não vaza dado de outro tenant.
   */
  private async assertSlugFree(slug: string, ignoreShopId?: string): Promise<void> {
    const [shop, tenantCount] = await Promise.all([
      this.prisma.barbershop.findUnique({ where: { slug }, select: { id: true } }),
      this.prisma.tenant.count({ where: { slug } }),
    ]);
    if ((shop && shop.id !== ignoreShopId) || tenantCount > 0) {
      throw new ConflictException('Esse slug já está em uso. Escolha outro.');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar unidades do tenant com o teto do plano.' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnitsResponse> {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'ver unidades');
    const sub = await ctx.tx.subscription.findUnique({
      where: { tenantId },
      select: { tier: true },
    });
    const tier = ((sub?.tier as PlanTier | undefined) ?? 'free') as PlanTier;
    const shops = await ctx.tx.barbershop.findMany({
      orderBy: { createdAt: 'asc' },
      select: unitSelect,
    });
    return {
      units: shops.map(toUnitDto),
      limit: limitsForTier(tier).maxUnits,
      tier,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar unidade (Location + Barbershop) no tenant atual.' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createUnitSchema)) body: CreateUnitInput,
  ): Promise<UnitDto> {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'criar unidades');
    await this.planLimits.assertCanAddUnit(ctx.tx, tenantId);
    await this.assertSlugFree(body.slug);
    const org = await ctx.tx.organization.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!org) throw new NotFoundException('Organização não encontrada.');
    const location = await ctx.tx.location.create({
      data: {
        tenantId,
        organizationId: org.id,
        name: body.name,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 ?? null,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: 'BR',
      },
    });
    const shop = await ctx.tx.barbershop.create({
      data: { tenantId, locationId: location.id, name: body.name, slug: body.slug },
      select: unitSelect,
    });
    return toUnitDto(shop);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar unidade; reativação passa pelo teto do plano.' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) body: UpdateUnitInput,
  ): Promise<UnitDto> {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'editar unidades');
    const existing = await ctx.tx.barbershop.findFirst({
      where: { id },
      select: { id: true, isActive: true, locationId: true },
    });
    if (!existing) throw new NotFoundException('Unidade não encontrada.');
    if (body.isActive === true && !existing.isActive) {
      await this.planLimits.assertCanAddUnit(ctx.tx, tenantId);
    }
    if (body.slug) await this.assertSlugFree(body.slug, existing.id);
    if (
      body.addressLine1 !== undefined ||
      body.addressLine2 !== undefined ||
      body.city !== undefined ||
      body.state !== undefined ||
      body.postalCode !== undefined
    ) {
      await ctx.tx.location.update({
        where: { id: existing.locationId },
        data: {
          ...(body.addressLine1 !== undefined && { addressLine1: body.addressLine1 }),
          ...(body.addressLine2 !== undefined && { addressLine2: body.addressLine2 ?? null }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.state !== undefined && { state: body.state }),
          ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        },
      });
    }
    const shop = await ctx.tx.barbershop.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      select: unitSelect,
    });
    return toUnitDto(shop);
  }
}
