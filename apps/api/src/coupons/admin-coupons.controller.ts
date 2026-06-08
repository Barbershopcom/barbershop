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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  type CouponDto,
  type CreateCouponInput,
  createCouponSchema,
  type UpdateCouponInput,
  updateCouponSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * CRUD de cupons (ADR-021 §1). Só admin/admin_barber. Tenant via @Tx (RLS).
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/coupons')
export class AdminCouponsController {
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
      throw new ForbiddenException('Apenas admin pode gerenciar cupons.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return { tenantId: employee.tenantId };
  }

  @Get()
  @ApiOkResponse({ description: 'Lista de cupons do tenant.' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CouponDto[]> {
    await this.requireAdmin(ctx, user);
    const rows = await ctx.tx.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Cupom criado.' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCouponSchema)) body: CreateCouponInput,
  ): Promise<CouponDto> {
    const admin = await this.requireAdmin(ctx, user);
    try {
      const created = await ctx.tx.coupon.create({
        data: {
          tenantId: admin.tenantId,
          code: body.code,
          description: body.description ?? null,
          discountType: body.discountType,
          discountValue: body.discountValue,
          minOrderCents: body.minOrderCents ?? null,
          validFrom: body.validFrom ? new Date(body.validFrom) : null,
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          maxRedemptions: body.maxRedemptions ?? null,
        },
      });
      return toDto(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ForbiddenException(`Já existe um cupom com o código '${body.code}'.`);
      }
      throw err;
    }
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Cupom atualizado.' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCouponSchema)) body: UpdateCouponInput,
  ): Promise<CouponDto> {
    await this.requireAdmin(ctx, user);
    try {
      const updated = await ctx.tx.coupon.update({
        where: { id },
        data: {
          ...(body.description !== undefined && { description: body.description }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.validUntil !== undefined && {
            validUntil: body.validUntil ? new Date(body.validUntil) : null,
          }),
          ...(body.maxRedemptions !== undefined && { maxRedemptions: body.maxRedemptions }),
        },
      });
      return toDto(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Cupom não encontrado.');
      }
      throw err;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Cupom removido.' })
  async remove(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);
    try {
      await ctx.tx.coupon.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Cupom não encontrado.');
      }
      throw err;
    }
  }
}

function toDto(row: {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderCents: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  isActive: boolean;
}): CouponDto {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discountType as CouponDto['discountType'],
    discountValue: row.discountValue,
    minOrderCents: row.minOrderCents,
    validFrom: row.validFrom ? row.validFrom.toISOString() : null,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    maxRedemptions: row.maxRedemptions,
    timesRedeemed: row.timesRedeemed,
    isActive: row.isActive,
  };
}
