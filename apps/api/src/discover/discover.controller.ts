import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type DiscoverItem,
  type DiscoverQuery,
  discoverQuerySchema,
} from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RESULTS = 50;

/**
 * Marketplace público de descoberta (ADR-020 §2). Sem auth, igual /slots.
 * Bypassa RLS de propósito (tenants são RLS-protegidos a membros) mas
 * filtra explicitamente por `listedPublicly = true`.
 *
 * Rate limit 60/min/IP. Cache HTTP 60s (catálogo de barbearias muda raro).
 */
@ApiTags('public-discover')
@Public()
@Controller('public/discover')
export class DiscoverController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiQuery({ name: 'barbearia-do-jaja', required: false, description: 'Busca por nome/slug.' })
  @ApiOkResponse({ description: 'Barbearias públicas, ranqueadas por nota.' })
  async list(
    @Query(new ZodValidationPipe(discoverQuerySchema)) query: DiscoverQuery,
  ): Promise<DiscoverItem[]> {
    const q = query.q?.trim();
    const now = new Date();

    // Multi-unidade (spec 2026-07-07): cada card é uma UNIDADE (barbershop
    // ativa de tenant público), com slug/endereço próprios. Barbershop não tem
    // relation Prisma com Tenant — resolve os tenants públicos primeiro.
    const publicTenants = await this.prisma.tenant.findMany({
      where: { listedPublicly: true },
      select: { id: true, name: true },
    });
    if (publicTenants.length === 0) return [];
    const publicTenantIds = publicTenants.map((t) => t.id);
    // Busca textual também casa com o nome da MARCA (tenant), não só da unidade.
    const qTenantIds = q
      ? publicTenants
          .filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
          .map((t) => t.id)
      : [];

    const shops = await this.prisma.barbershop.findMany({
      where: {
        isActive: true,
        tenantId: { in: publicTenantIds },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                ...(qTenantIds.length > 0 ? [{ tenantId: { in: qTenantIds } }] : []),
              ],
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        tenantId: true,
        location: { select: { addressLine1: true, city: true } },
      },
      take: MAX_RESULTS,
    });
    if (shops.length === 0) return [];

    const shopIds = shops.map((s) => s.id);
    const tenantIds = [...new Set(shops.map((s) => s.tenantId))];

    // Rating/preço/equipe por unidade; promoções seguem tenant-scoped.
    const [ratings, prices, employees, promotions] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['barbershopId'],
        where: { barbershopId: { in: shopIds } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.service.groupBy({
        by: ['barbershopId'],
        where: { barbershopId: { in: shopIds }, isActive: true },
        _min: { basePriceCents: true },
      }),
      this.prisma.employee.groupBy({
        by: ['barbershopId'],
        where: { barbershopId: { in: shopIds }, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.promotion.findMany({
        where: {
          tenantId: { in: tenantIds },
          isActive: true,
          AND: [
            { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
            { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
          ],
        },
        select: { tenantId: true },
      }),
    ]);

    const ratingByShop = new Map(
      ratings.map((r) => [
        r.barbershopId,
        { avg: round1(r._avg.rating), count: r._count._all },
      ]),
    );
    const priceByShop = new Map(
      prices.map((p) => [p.barbershopId, p._min.basePriceCents ?? null]),
    );
    const employeesByShop = new Map(employees.map((e) => [e.barbershopId, e._count._all]));
    const promotionTenantIds = new Set(promotions.map((p) => p.tenantId));

    const items: DiscoverItem[] = shops.map((s) => {
      const rating = ratingByShop.get(s.id);
      const addressLine = `${s.location.addressLine1} • ${s.location.city}`;
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        ratingAvg: rating?.avg ?? null,
        ratingCount: rating?.count ?? 0,
        addressLine,
        neighborhood: s.location.city || null,
        priceFromCents: priceByShop.get(s.id) ?? null,
        employeeCount: employeesByShop.get(s.id) ?? 0,
        hasPromotion: promotionTenantIds.has(s.tenantId),
      };
    });

    // Ranking determinístico: avaliados primeiro, maior nota, depois nome.
    items.sort((a, b) => {
      const aHas = a.ratingCount > 0 ? 1 : 0;
      const bHas = b.ratingCount > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      const aAvg = a.ratingAvg ?? 0;
      const bAvg = b.ratingAvg ?? 0;
      if (aAvg !== bAvg) return bAvg - aAvg;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    return items;
  }
}

function round1(avg: number | null): number | null {
  if (avg === null) return null;
  return Math.round(avg * 10) / 10;
}
