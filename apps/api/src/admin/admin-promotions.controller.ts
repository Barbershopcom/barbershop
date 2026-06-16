import {
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

const CreatePromotionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  description: z.string().max(500).optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().positive('Desconto deve ser positivo'),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});
type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;

const UpdatePromotionSchema = CreatePromotionSchema.partial().extend({
  isActive: z.boolean().optional(),
});
type UpdatePromotionInput = z.infer<typeof UpdatePromotionSchema>;

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
 * Só admin/admin_barber. Tenant via @Tx (RLS); role validado em requireAdmin.
 *
 * discountType: 'percent' (basis points, 1000=10%) | 'fixed' (centavos).
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/promotions')
export class AdminPromotionsController {
  private async requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: user.id },
      select: { tenantId: true, role: true },
    });
    if (!employee) throw new ForbiddenException('Usuário não vinculado.');
    if (employee.role !== 'admin' && employee.role !== 'admin_barber') {
      throw new ForbiddenException('Apenas admin pode gerenciar promoções.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return { tenantId: employee.tenantId };
  }

  @Get()
  @ApiOperation({ summary: 'Listar promoções (ativas e inativas) do tenant.' })
  @ApiOkResponse({ description: 'Lista de promoções' })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  @ApiForbiddenResponse({ description: 'Usuário sem role admin' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PromotionResponseDto[]> {
    await this.requireAdmin(ctx, user);
    const promotions = await ctx.tx.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    return promotions.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar promoção para exibição pública.' })
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
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreatePromotionSchema)) body: CreatePromotionInput,
  ): Promise<PromotionResponseDto> {
    const admin = await this.requireAdmin(ctx, user);

    const promotion = await ctx.tx.promotion.create({
      data: {
        tenantId: admin.tenantId,
        isActive: true,
        name: body.name,
        description: body.description ?? null,
        discountType: body.discountType,
        discountValue: body.discountValue,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      },
    });
    return toDto(promotion);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar promoção (campos opcionais).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Promoção atualizada' })
  @ApiNotFoundResponse({ description: 'Promoção não encontrada' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePromotionSchema)) body: UpdatePromotionInput,
  ): Promise<PromotionResponseDto> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.promotion.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Promoção não encontrada.');

    const promotion = await ctx.tx.promotion.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.discountType !== undefined && { discountType: body.discountType }),
        ...(body.discountValue !== undefined && { discountValue: body.discountValue }),
        ...(body.validFrom !== undefined && {
          validFrom: body.validFrom ? new Date(body.validFrom) : null,
        }),
        ...(body.validUntil !== undefined && {
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return toDto(promotion);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar promoção (irreversível).' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Promoção não encontrada' })
  async delete(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);

    const existing = await ctx.tx.promotion.findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Promoção não encontrada.');

    await ctx.tx.promotion.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PromotionResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    discountType: row.discountType,
    discountValue: row.discountValue,
    validFrom: row.validFrom ? row.validFrom.toISOString() : null,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
