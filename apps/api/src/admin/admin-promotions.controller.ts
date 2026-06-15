import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Auth } from '../auth/auth.decorators';

const CreatePromotionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  description: z.string().max(500).optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().positive('Desconto deve ser positivo'),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const UpdatePromotionSchema = CreatePromotionSchema.partial();

interface PromotionResponseDto {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Promotions API — CRUD de promoções exibidas na descoberta pública.
 *
 * **Autenticação:** Bearer token (role: admin)
 * **Rate limit:** 100/min
 * **Cache:** Promoções são cacheadas por 60s no cliente
 *
 * **Invariantes:**
 * - discountType: 'percent' (valor em basis points: 1000=10%) | 'fixed' (em centavos)
 * - Datas UTC (validFrom/validUntil, ISO 8601)
 * - isActive=false oculta de /public/discover, mas mantém histórico
 * - Exibição: qualquer promoção com isActive=true E período válido (now entre validFrom/validUntil)
 *
 * **Exemplo:**
 * - percent: discountValue=3000 → 30% OFF
 * - fixed: discountValue=500 → R$ 5,00 OFF
 */
@ApiTags('admin')
@Controller('admin/promotions')
@UseGuards(TenantGuard)
@Auth('admin')
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * **[GET] Listar promoções do tenant**
   *
   * Retorna todas as promoções (ativas e inativas) do tenant.
   * Útil para gerenciamento administrativo e preview de datas.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar promoções',
    description: 'Retorna todas as promoções (ativas/inativas) do tenant.',
  })
  @ApiOkResponse({
    description: 'Lista de promoções',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: '30% OFF Corte + Barba' },
          description: { type: 'string', example: 'Promoção especial de segunda-feira' },
          discountType: { type: 'string', enum: ['percent', 'fixed'] },
          discountValue: { type: 'number', example: 3000 },
          validFrom: { type: 'string', format: 'date-time', nullable: true },
          validUntil: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  @ApiForbiddenResponse({ description: 'Usuário sem role admin' })
  async list(): Promise<PromotionResponseDto[]> {
    const tenantId = (this as any).req.tenantId;
    const promotions = await this.prisma.promotion.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return promotions.map((p) => ({
      ...p,
      validFrom: p.validFrom?.toISOString() ?? null,
      validUntil: p.validUntil?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * **[POST] Criar nova promoção**
   *
   * Cria uma promoção que será exibida em /public/tenants/:slug/promotions
   * se estiver ativa E dentro do período de validade.
   *
   * **Request body:**
   * - `name` (string, 1-200 chars): Título da promoção
   * - `description` (string, opcional, ≤500 chars): Detalhes
   * - `discountType` (enum): 'percent' | 'fixed'
   * - `discountValue` (number): basis points (percent) ou centavos (fixed)
   * - `validFrom` (ISO 8601, opcional): Início da validade (default: now)
   * - `validUntil` (ISO 8601, opcional): Fim da validade (default: sem limite)
   *
   * **Exemplos:**
   * - 30% OFF: { discountType: 'percent', discountValue: 3000 }
   * - R$ 5 OFF: { discountType: 'fixed', discountValue: 500 }
   *
   * **Response 201:** Promoção criada (isActive=true por padrão)
   * **Response 400:** Validação falhou
   */
  @Post()
  @ApiOperation({
    summary: 'Criar promoção',
    description: 'Cria uma nova promoção para exibição pública.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'discountType', 'discountValue'],
      properties: {
        name: { type: 'string', example: '30% OFF Corte + Barba' },
        description: { type: 'string', example: 'Válido segundas a quartas' },
        discountType: { type: 'string', enum: ['percent', 'fixed'] },
        discountValue: { type: 'number', example: 3000 },
        validFrom: { type: 'string', format: 'date-time' },
        validUntil: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Promoção criada com sucesso' })
  @ApiBadRequestResponse({ description: 'Validação falhou' })
  async create(@Body() body: any): Promise<PromotionResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = CreatePromotionSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    const promotion = await this.prisma.promotion.create({
      data: {
        tenantId,
        isActive: true,
        ...valid.data,
        validFrom: valid.data.validFrom ? new Date(valid.data.validFrom) : null,
        validUntil: valid.data.validUntil ? new Date(valid.data.validUntil) : null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...promotion,
      validFrom: promotion.validFrom?.toISOString() ?? null,
      validUntil: promotion.validUntil?.toISOString() ?? null,
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
    };
  }

  /**
   * **[PATCH] Atualizar promoção**
   *
   * Atualiza dados de uma promoção existente.
   * Mudar `isActive` ou datas afeta visibilidade imediata.
   *
   * **Response 200:** Promoção atualizada
   * **Response 404:** Promoção não encontrada
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar promoção',
    description: 'Atualiza uma promoção existente. Campos opcionais.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        discountType: { type: 'string', enum: ['percent', 'fixed'] },
        discountValue: { type: 'number' },
        validFrom: { type: 'string', format: 'date-time' },
        validUntil: { type: 'string', format: 'date-time' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiOkResponse({ description: 'Promoção atualizada' })
  @ApiNotFoundResponse({ description: 'Promoção não encontrada' })
  async update(@Param('id') id: string, @Body() body: any): Promise<PromotionResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = UpdatePromotionSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    // Validate ownership before update (IDOR prevention)
    const existing = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Promoção não encontrada');
    }

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...valid.data,
        validFrom: valid.data.validFrom ? new Date(valid.data.validFrom) : undefined,
        validUntil: valid.data.validUntil ? new Date(valid.data.validUntil) : undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...promotion,
      validFrom: promotion.validFrom?.toISOString() ?? null,
      validUntil: promotion.validUntil?.toISOString() ?? null,
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
    };
  }

  /**
   * **[DELETE] Deletar promoção**
   *
   * Remove uma promoção permanentemente.
   * ⚠️ Cuidado: Operação irreversível.
   *
   * **Response 204:** Deletado com sucesso
   * **Response 404:** Promoção não encontrada
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Deletar promoção',
    description: 'Remove uma promoção permanentemente. Operação irreversível.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Promoção não encontrada' })
  async delete(@Param('id') id: string): Promise<void> {
    const tenantId = (this as any).req.tenantId;

    // Validate ownership before delete (IDOR prevention)
    const existing = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Promoção não encontrada');
    }

    await this.prisma.promotion.delete({ where: { id } });
  }
}
