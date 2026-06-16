import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

interface PublicPromotionDto {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  tenantSlug: string;
  tenantName: string;
  validUntil: string | null;
}

/**
 * **Public Promotions API** — Promoções destacadas de tenants públicos.
 *
 * Retorna promoções ativas (isActive=true E dentro do período válido)
 * dos tenants listados publicamente (listedPublicly=true).
 *
 * Útil para home exibir "Promoções da semana" em carousel.
 *
 * **Rate limit:** 60/min/IP
 * **Cache:** 60s (promoções mudam diariamente)
 */
@ApiTags('public-discover')
@Public()
@Controller('public/promotions')
export class PublicPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * **[GET] Listar promoções ativas**
   *
   * Retorna promoções de tenants públicos que estão em período válido.
   * Ordenado por data de criação (mais recentes primeiro).
   *
   * **Invariantes:**
   * - isActive=true (para aparecer na descoberta)
   * - tenant.listedPublicly=true (barbershop pública)
   * - Período válido: now >= validFrom (ou null) AND now <= validUntil (ou null)
   *
   * **Response:**
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "30% OFF Corte + Barba",
   *     "discountType": "percent",
   *     "discountValue": 3000,
   *     "tenantSlug": "barbershop-jaja",
   *     "tenantName": "Barbearia do Jajá",
   *     "validUntil": "2026-06-21T23:59:59Z"
   *   }
   * ]
   * ```
   *
   * **Response 200:** Array de promoções ativas (pode estar vazio)
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOkResponse({
    description: 'Promoções ativas dos tenants públicos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: '30% OFF Corte + Barba' },
          description: { type: 'string', nullable: true },
          discountType: { type: 'string', enum: ['percent', 'fixed'] },
          discountValue: { type: 'number', example: 3000 },
          tenantSlug: { type: 'string', example: 'barbershop-jaja' },
          tenantName: { type: 'string', example: 'Barbearia do Jajá' },
          validUntil: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  async list(): Promise<PublicPromotionDto[]> {
    const now = new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        // Período válido: now >= validFrom (ou null) AND now <= validUntil (ou null)
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
        // Apenas de tenants públicos
        tenant: {
          listedPublicly: true,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        validUntil: true,
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Máximo 20 promoções para carousel
    });

    return promotions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      tenantSlug: p.tenant.slug,
      tenantName: p.tenant.name,
      validUntil: p.validUntil?.toISOString() ?? null,
    }));
  }
}
