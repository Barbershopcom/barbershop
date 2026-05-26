import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type SlotsQuery, slotsQuerySchema, type SlotsResponse } from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { dateEndExclusiveUtc, dateStartUtc, SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

/**
 * Endpoint público de busca de slots. Não exige JWT (ADR-004 §4).
 *
 * Rate limit: 60 req/min por IP (suficiente pra polling razoável,
 * barra scraping casual). Pra DDoS de verdade precisaria Cloudflare,
 * fora do escopo MVP.
 *
 * Cache HTTP curto (10s) — cliente pode ver "slot fantasma" recém-
 * reservado por outro; UX trata com erro no booking real.
 */
@ApiTags('public-slots')
@Public()
@Controller('public/tenants/:slug/slots')
export class SlotsController {
  constructor(
    private readonly repo: SlotsRepository,
    private readonly slots: SlotsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=10')
  @ApiParam({ name: 'slug', description: 'Slug do tenant (ex: barbearia-do-ze)' })
  @ApiQuery({
    name: 'serviceId',
    description: 'UUID do service. Backend usa `service.durationMin` como step.',
  })
  @ApiQuery({
    name: 'barberId',
    required: false,
    description: 'Filtra por um barbeiro específico. Sem ele, considera todos com capability.',
  })
  @ApiQuery({
    name: 'from',
    description: 'Data inicial YYYY-MM-DD no timezone do tenant.',
  })
  @ApiQuery({
    name: 'to',
    description: 'Data final YYYY-MM-DD (inclusiva). Janela máxima 14 dias.',
  })
  @ApiOkResponse({
    description: 'Slots disponíveis na janela informada para o serviço escolhido.',
  })
  async list(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(slotsQuerySchema)) query: SlotsQuery,
  ): Promise<SlotsResponse> {
    const tenant = await this.repo.resolveTenant(slug);
    const service = await this.repo.resolveActiveService(tenant.id, query.serviceId);

    const fromDateUtc = dateStartUtc(query.from, tenant.timezone);
    const toDateUtcExclusive = dateEndExclusiveUtc(query.to, tenant.timezone);

    const { shopHours, barbers } = await this.repo.loadSlotInputs({
      tenantId: tenant.id,
      barbershopId: service.barbershopId,
      serviceId: service.id,
      barberId: query.barberId,
      fromDateUtc,
      toDateUtcExclusive,
    });

    const slots = this.slots.compute({
      timezone: tenant.timezone,
      serviceDurationMin: service.durationMin,
      serviceBufferMin: service.bufferMin,
      shopHours,
      barbers,
      fromDate: query.from,
      toDate: query.to,
      now: new Date(),
    });

    return {
      timezone: tenant.timezone,
      tenantSlug: tenant.slug,
      serviceId: service.id,
      serviceDurationMin: service.durationMin,
      slots: slots.map((s) => ({
        startAt: s.startAt.toISOString(),
        barberId: s.barberId,
        barberName: s.barberName,
      })),
    };
  }
}
