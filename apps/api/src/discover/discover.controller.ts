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
  @ApiQuery({ name: 'q', required: false, description: 'Busca por nome/slug.' })
  @ApiOkResponse({ description: 'Barbearias públicas, ranqueadas por nota.' })
  async list(
    @Query(new ZodValidationPipe(discoverQuerySchema)) query: DiscoverQuery,
  ): Promise<DiscoverItem[]> {
    const q = query.q?.trim();
    const tenants = await this.prisma.tenant.findMany({
      where: {
        listedPublicly: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, slug: true, name: true, addressLine: true },
      take: MAX_RESULTS,
    });
    if (tenants.length === 0) return [];

    const tenantIds = tenants.map((t) => t.id);

    // Rating por tenant (agregado das reviews) + menor preço de serviço ativo.
    const [ratings, prices] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.service.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds }, isActive: true },
        _min: { basePriceCents: true },
      }),
    ]);

    const ratingByTenant = new Map(
      ratings.map((r) => [
        r.tenantId,
        { avg: round1(r._avg.rating), count: r._count._all },
      ]),
    );
    const priceByTenant = new Map(
      prices.map((p) => [p.tenantId, p._min.basePriceCents ?? null]),
    );

    const items: DiscoverItem[] = tenants.map((t) => {
      const rating = ratingByTenant.get(t.id);
      return {
        slug: t.slug,
        name: t.name,
        ratingAvg: rating?.avg ?? null,
        ratingCount: rating?.count ?? 0,
        addressLine: t.addressLine,
        priceFromCents: priceByTenant.get(t.id) ?? null,
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
