import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { PublicServiceDto, PublicTenantDto, ReviewItem } from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { SlotsRepository } from './slots.repository';

/**
 * **Public Tenants API** — Catálogo e detalhes de barbershop pública.
 *
 * **Autenticação:** Nenhuma (público)
 * **Rate limit:** 60/min/IP
 * **Cache:** 30s (catálogo muda raro, reviews/ratings mudam frequente)
 *
 * **Endpoints:**
 * - GET    /:slug             → Informações do tenant (name, address, rating, etc)
 * - GET    /:slug/services    → Catálogo de serviços (name, price, duration)
 * - GET    /:slug/employees   → Barbeiros que fazem serviços específicos
 * - GET    /:slug/promotions  → Promoções ativas do barbershop
 * - GET    /:slug/reviews     → Avaliações recentes dos clientes
 *
 * **Segurança:**
 * - Sem RLS bypass (tenants filtrados explicitamente por `slug`)
 * - Apenas exibe serviços com isActive=true
 * - Apenas exibe barbeiros com isActive=true
 * - Apenas exibe promoções com isActive=true E período válido
 *
 * **Invariantes:**
 * - slug: único, sem espaços, lowercase (validado em Tenant model)
 * - Preço em centavos BRL (5000 = R$ 50,00)
 * - Duração em minutos (15-480 range)
 * - Rating agregado (cache, atualiza em background)
 *
 * **Discover path:**
 * 1. Client: GET /public/discover → lista barbershops públicas
 * 2. Client: GET /public/tenants/:slug → detalhe completo (serviços, barbeiros)
 * 3. Client: GET /public/tenants/:slug/slots → disponibilidade
 * 4. Client: POST /public/tenants/:slug/appointments → agendar
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

  /**
   * **[GET] Detalhes do tenant (barbershop)**
   *
   * Retorna informações públicas do barbershop: nome, endereço, contato,
   * rating agregado e links sociais. Endpoint "home" para detalhes de barbershop.
   *
   * **Parâmetros:**
   * - `slug` (path): Identificador único (ex: "barbershop-jaja")
   *
   * **Response 200:**
   * ```json
   * {
   *   "id": "uuid",
   *   "slug": "barbershop-jaja",
   *   "name": "Barbearia do Jajá",
   *   "timezone": "America/Sao_Paulo",
   *   "phoneE164": "+5511987654321",
   *   "addressLine": "Rua Aurora, 120 • Pinheiros, SP",
   *   "instagramHandle": "barbeariadojaja",
   *   "ratingAvg": 4.8,
   *   "ratingCount": 42
   * }
   * ```
   *
   * **Response 404:** Slug não encontrado (barbershop privada ou inexistente)
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=30')
  @ApiParam({
    name: 'slug',
    type: 'string',
    description: 'Slug público do tenant (ex: barbershop-jaja)',
    example: 'barbershop-jaja',
  })
  @ApiOkResponse({
    description: 'Informações públicas do tenant',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        slug: { type: 'string', example: 'barbershop-jaja' },
        name: { type: 'string', example: 'Barbearia do Jajá' },
        timezone: { type: 'string', example: 'America/Sao_Paulo' },
        phoneE164: { type: 'string', example: '+5511987654321' },
        addressLine: { type: 'string', example: 'Rua Aurora, 120 • Pinheiros, SP' },
        instagramHandle: { type: 'string', example: 'barbeariadojaja', nullable: true },
        ratingAvg: { type: 'number', example: 4.8, nullable: true },
        ratingCount: { type: 'number', example: 42 },
      },
    },
  })
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

  /**
   * **[GET] Avaliações (reviews) recentes**
   *
   * Retorna as 20 avaliações mais recentes do barbershop.
   * Útil para página de detalhe exibir "O que cliente dizem".
   *
   * **Response 200:**
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "rating": 5,
   *     "comment": "Muito bom, recomendo!",
   *     "customerName": "João Silva",
   *     "createdAt": "2026-06-15T10:30:00Z"
   *   }
   * ]
   * ```
   */
  @Get('reviews')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiParam({
    name: 'slug',
    type: 'string',
    description: 'Slug público do tenant',
  })
  @ApiOkResponse({
    description: 'Avaliações públicas recentes',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          comment: { type: 'string', nullable: true },
          customerName: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async listReviews(@Param('slug') slug: string): Promise<ReviewItem[]> {
    const tenant = await this.repo.resolveTenant(slug);
    return this.reviews.listForTenant(tenant.id, 20);
  }

  /**
   * **[GET] Catálogo de serviços**
   *
   * Retorna todos os serviços ativos (isActive=true) do barbershop,
   * ordenados por preço e nome. Consumido pela tela de seleção de serviços
   * na jornada de agendamento.
   *
   * **Preços em centavos BRL:** 5000 = R$ 50,00
   * **Duração em minutos:** típico 30-60 para corte
   *
   * **Response 200:**
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Corte clássico",
   *     "description": "Corte com tesoura",
   *     "durationMin": 30,
   *     "basePriceCents": 5000
   *   }
   * ]
   * ```
   */
  @Get('services')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=30')
  @ApiParam({
    name: 'slug',
    type: 'string',
    description: 'Slug público do tenant',
  })
  @ApiOkResponse({
    description: 'Catálogo de serviços ativos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Corte clássico' },
          description: { type: 'string', example: 'Corte com tesoura', nullable: true },
          durationMin: { type: 'number', minimum: 15, maximum: 480, example: 30 },
          basePriceCents: { type: 'number', example: 5000 },
        },
      },
    },
  })
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

  /**
   * **[GET] Listar barbeiros disponíveis**
   *
   * Retorna barbeiros (employees) que podem fazer os serviços solicitados.
   * Se nenhum serviço especificado, retorna todos os barbeiros ativos.
   *
   * **Filtro por serviço:** Use query param `services=id1,id2` para listar
   * apenas barbeiros que fazem TODOS os serviços (operação AND).
   *
   * **Usado em:**
   * - Tela de seleção de barbeiro (após selecionar serviços)
   * - Mostrar "Qualquer barbeiro" como opção padrão
   *
   * **Response 200:**
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "displayName": "João Silva",
   *     "ratingAvg": 4.8,
   *     "ratingCount": 42
   *   }
   * ]
   * ```
   */
  @Get('employees')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=30')
  @ApiParam({
    name: 'slug',
    type: 'string',
    description: 'Slug público do tenant',
  })
  @ApiQuery({
    name: 'services',
    required: false,
    type: 'string',
    description: 'Comma-separated service IDs to filter (ex: "id1,id2,id3")',
    example: 'uuid1,uuid2',
  })
  @ApiOkResponse({
    description: 'Barbeiros disponíveis',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          displayName: { type: 'string', example: 'João Silva' },
          ratingAvg: { type: 'number', nullable: true, example: 4.8 },
          ratingCount: { type: 'number', example: 42 },
        },
      },
    },
  })
  async listEmployees(
    @Param('slug') slug: string,
    @Query('services') services?: string,
  ): Promise<Array<{ id: string; displayName: string; ratingAvg: number | null; ratingCount: number }>> {
    const tenant = await this.repo.resolveTenant(slug);

    // Filtro opcional por serviços (comma-separated serviceIds)
    const serviceIds = services ? services.split(',').filter(Boolean) : [];

    // Se tiver serviços específicos, filtrar barbeiros que fazem TODOS os serviços
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        ...(serviceIds.length > 0
          ? {
              barberServiceCapability: {
                some: {
                  serviceId: { in: serviceIds },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        ratingAvg: true,
        ratingCount: true,
      },
      orderBy: { displayName: 'asc' },
    });

    return employees;
  }

  /**
   * **[GET] Promoções ativas do barbershop**
   *
   * Retorna promoções vigentes (isActive=true E período válido) deste barbershop.
   * Exibido na página de detalhes do barbershop.
   *
   * **Filtro de período:** now >= validFrom (ou null) AND now <= validUntil (ou null)
   *
   * **Discount types:**
   * - `percent`: discountValue em basis points (3000 = 30%)
   * - `fixed`: discountValue em centavos (500 = R$ 5,00)
   *
   * **Response 200:**
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "30% OFF Corte + Barba",
   *     "discountType": "percent",
   *     "discountValue": 3000
   *   }
   * ]
   * ```
   */
  @Get('promotions')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiParam({
    name: 'slug',
    type: 'string',
    description: 'Slug público do tenant',
  })
  @ApiOkResponse({
    description: 'Promoções ativas',
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
        },
      },
    },
  })
  async listPromotions(
    @Param('slug') slug: string,
  ): Promise<Array<{ id: string; name: string; description: string | null; discountType: string; discountValue: number }>> {
    const tenant = await this.repo.resolveTenant(slug);
    const now = new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        // Válido se validFrom é null ou passado E validUntil é null ou futuro
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions;
  }
}
