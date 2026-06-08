import { z } from 'zod';

import { uuidSchema } from './common';

/**
 * Cupons de desconto (ADR-021). Lógica de cálculo/validação é pura aqui
 * pra ser reusada no backend (booking + preview) e testada isolada.
 */

export const couponDiscountTypes = ['percent', 'fixed'] as const;
export type CouponDiscountType = (typeof couponDiscountTypes)[number];

/** Código: 3-32 chars alfanuméricos + hífen; normalizado pra UPPER. */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen.')
  .transform((v) => v.toUpperCase());

const isoDateTimeSchema = z.string().datetime();

export const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    description: z.string().trim().max(200).optional(),
    discountType: z.enum(couponDiscountTypes),
    /** percent: basis points 1..10000 (1000=10%); fixed: centavos > 0. */
    discountValue: z.number().int().positive(),
    minOrderCents: z.number().int().positive().optional(),
    validFrom: isoDateTimeSchema.optional(),
    validUntil: isoDateTimeSchema.optional(),
    maxRedemptions: z.number().int().positive().optional(),
  })
  .refine((c) => c.discountType !== 'percent' || c.discountValue <= 10000, {
    message: 'Percentual não pode passar de 100% (10000 bps).',
    path: ['discountValue'],
  })
  .refine(
    (c) => !c.validFrom || !c.validUntil || new Date(c.validFrom) < new Date(c.validUntil),
    { message: '`validFrom` deve ser antes de `validUntil`.', path: ['validFrom'] },
  );
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

/** Edição: tudo opcional; `isActive` pra ligar/desligar. */
export const updateCouponSchema = z.object({
  description: z.string().trim().max(200).nullish(),
  isActive: z.boolean().optional(),
  validUntil: isoDateTimeSchema.nullish(),
  maxRedemptions: z.number().int().positive().nullish(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

/** Preview público no booking. */
export const validateCouponSchema = z.object({
  code: couponCodeSchema,
  serviceId: uuidSchema,
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export interface CouponDto {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderCents: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  isActive: boolean;
}

export type CouponInvalidReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'exhausted'
  | 'below_min';

export interface CouponValidationResult {
  valid: boolean;
  reason?: CouponInvalidReason;
  discountCents?: number;
  finalPriceCents?: number;
}

/** Dados mínimos do cupom pra validação/cálculo (subset do model). */
export interface CouponRule {
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderCents: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  isActive: boolean;
}

/** Desconto em centavos, nunca acima do `baseCents`. */
export function computeCouponDiscount(baseCents: number, coupon: CouponRule): number {
  const raw =
    coupon.discountType === 'percent'
      ? Math.floor((baseCents * coupon.discountValue) / 10000)
      : coupon.discountValue;
  return Math.min(Math.max(raw, 0), baseCents);
}

/** Valida regra + calcula desconto/preço final. Pura (recebe `now`). */
export function validateCoupon(
  baseCents: number,
  coupon: CouponRule,
  now: Date,
): CouponValidationResult {
  if (!coupon.isActive) return { valid: false, reason: 'inactive' };
  if (coupon.validFrom && now < coupon.validFrom) {
    return { valid: false, reason: 'not_started' };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { valid: false, reason: 'expired' };
  }
  if (coupon.maxRedemptions !== null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return { valid: false, reason: 'exhausted' };
  }
  if (coupon.minOrderCents !== null && baseCents < coupon.minOrderCents) {
    return { valid: false, reason: 'below_min' };
  }
  const discountCents = computeCouponDiscount(baseCents, coupon);
  return {
    valid: true,
    discountCents,
    finalPriceCents: baseCents - discountCents,
  };
}

/** Mensagem amigável (pt-BR) por motivo de recusa. */
export function couponReasonLabel(reason: CouponInvalidReason): string {
  switch (reason) {
    case 'not_found':
      return 'Cupom não encontrado.';
    case 'inactive':
      return 'Cupom desativado.';
    case 'not_started':
      return 'Cupom ainda não está válido.';
    case 'expired':
      return 'Cupom expirado.';
    case 'exhausted':
      return 'Cupom esgotado.';
    case 'below_min':
      return 'Valor do serviço abaixo do mínimo do cupom.';
  }
}
