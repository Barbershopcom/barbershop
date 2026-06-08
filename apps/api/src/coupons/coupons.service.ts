import { Injectable, Logger } from '@nestjs/common';
import {
  type CouponRule,
  type CouponValidationResult,
  validateCoupon,
} from '@barbearia/schemas';

import { PrismaService } from '../prisma/prisma.service';

/** Linha mínima do cupom pra validação/aplicação. */
export interface CouponRow extends CouponRule {
  id: string;
  code: string;
}

/**
 * Lógica de cupom reusada por preview público e booking (ADR-021).
 * Usa PrismaService (bypassRLS) com filtro explícito por tenantId — mesmo
 * padrão de /slots e /discover. CRUD admin fica no controller (via @Tx).
 */
@Injectable()
export class CouponsService {
  private static readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Busca cupom por (tenant, code). code é case-insensitive (armazenado UPPER). */
  async findByCode(tenantId: string, code: string): Promise<CouponRow | null> {
    const c = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.trim().toUpperCase() } },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderCents: true,
        validFrom: true,
        validUntil: true,
        maxRedemptions: true,
        timesRedeemed: true,
        isActive: true,
      },
    });
    if (!c) return null;
    return { ...c, discountType: c.discountType as CouponRule['discountType'] };
  }

  /** Valida sem reservar — usado no preview e como pré-cheque no booking. */
  async validateByCode(
    tenantId: string,
    code: string,
    baseCents: number,
    now: Date,
  ): Promise<CouponValidationResult & { couponId?: string }> {
    const coupon = await this.findByCode(tenantId, code);
    if (!coupon) return { valid: false, reason: 'not_found' };
    const result = validateCoupon(baseCents, coupon, now);
    return { ...result, couponId: coupon.id };
  }

  /**
   * Reserva atômica de 1 resgate (guard de maxRedemptions, ADR-021 §4).
   * Retorna true se reservou. UPDATE condicional resolve a corrida.
   */
  async tryReserve(couponId: string): Promise<boolean> {
    const n = await this.prisma.$executeRaw`
      UPDATE coupons
         SET times_redeemed = times_redeemed + 1, updated_at = now()
       WHERE id = ${couponId}::uuid
         AND (max_redemptions IS NULL OR times_redeemed < max_redemptions)`;
    return n === 1;
  }

  /** Compensação: devolve a reserva (ex.: booking falhou após reservar). */
  async releaseReservation(couponId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE coupons
         SET times_redeemed = times_redeemed - 1, updated_at = now()
       WHERE id = ${couponId}::uuid AND times_redeemed > 0`;
  }

  async recordRedemption(args: {
    tenantId: string;
    couponId: string;
    appointmentId: string;
    customerEmail: string | null;
    discountCents: number;
  }): Promise<void> {
    try {
      await this.prisma.couponRedemption.create({ data: args });
    } catch (err) {
      // appointment_id é unique — replay/race não duplica. Log e segue.
      CouponsService.logger.debug(
        `recordRedemption no-op (${args.appointmentId}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
