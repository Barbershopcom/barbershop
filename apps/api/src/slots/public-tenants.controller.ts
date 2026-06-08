import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { PublicServiceDto, PublicTenantDto, ReviewItem } from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { SlotsRepository } from './slots.repository';

/**
 * Endpoints públicos do tenant — consumidos pela web pública de booking
 * (ADR-009). Sem auth, igual ao /slots. Bypassa RLS de propósito mas
 * filtra explicitamente por `tenantId` em todo query (mesma estratégia
 * do SlotsRepository).
 *
 * Rate limit 60/min/IP. Cache HTTP 30s (catálogo muda raro).
 */
@ApiTags('public-tenants')
@Public()
@Controller('public/tenants/:slug')
export class PublicTenantsController {
  constructor(
    private readonly repo: SlotsRepository,
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=30')
  @ApiParam({ name: 'slug', description: 'Slug público da barbearia.' })
  @ApiOkResponse({ description: 'Dados públicos do tenant.' })
  async get(@Param('slug') slug: string): Promise<PublicTenantDto> {
    const tenant = await this.repo.resolveTenant(slug);
    const rating = await this.reviews.tenantRating(tenant.id);
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      timezone: tenant.timezone,
      phoneE164: tenant.phoneE164,
      addressLine: tenant.addressLine,
      instagramHandle: tenant.instagramHandle,
      ratingAvg: rating.avg,
      ratingCount: rating.count,
    };
  }

  @Get('reviews')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiParam({ name: 'slug', description: 'Slug público da barbearia.' })
  @ApiOkResponse({ description: 'Avaliações públicas recentes da barbearia.' })
  async listReviews(@Param('slug') slug: string): Promise<ReviewItem[]> {
    const tenant = await this.repo.resolveTenant(slug);
    return this.reviews.listForTenant(tenant.id, 20);
  }

  @Get('services')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=30')
  @ApiParam({ name: 'slug', description: 'Slug público da barbearia.' })
  @ApiOkResponse({ description: 'Catálogo de serviços ativos do tenant.' })
  async listServices(@Param('slug') slug: string): Promise<PublicServiceDto[]> {
    const tenant = await this.repo.resolveTenant(slug);
    const services = await this.prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        basePriceCents: true,
      },
      orderBy: [{ basePriceCents: 'asc' }, { name: 'asc' }],
    });
    return services;
  }
}
