import {
  type CouponRule,
  computeCouponDiscount,
  validateCoupon,
} from '@barbearia/schemas';

/**
 * Testes das funções puras de cupom (ADR-021 §3). Sem DB, roda offline.
 */
const NOW = new Date('2026-06-08T12:00:00Z');

function rule(overrides: Partial<CouponRule> = {}): CouponRule {
  return {
    discountType: 'percent',
    discountValue: 1000, // 10%
    minOrderCents: null,
    validFrom: null,
    validUntil: null,
    maxRedemptions: null,
    timesRedeemed: 0,
    isActive: true,
    ...overrides,
  };
}

describe('computeCouponDiscount', () => {
  it('percent: 10% de 6000 = 600', () => {
    expect(computeCouponDiscount(6000, rule({ discountValue: 1000 }))).toBe(600);
  });

  it('percent: arredonda pra baixo (floor)', () => {
    // 5% de 1999 = 99.95 → 99
    expect(computeCouponDiscount(1999, rule({ discountValue: 500 }))).toBe(99);
  });

  it('fixed: desconto fixo em centavos', () => {
    expect(
      computeCouponDiscount(6000, rule({ discountType: 'fixed', discountValue: 1500 })),
    ).toBe(1500);
  });

  it('fixed nunca passa do valor base (preço final >= 0)', () => {
    expect(
      computeCouponDiscount(1000, rule({ discountType: 'fixed', discountValue: 5000 })),
    ).toBe(1000);
  });
});

describe('validateCoupon', () => {
  it('válido: retorna desconto e preço final', () => {
    const r = validateCoupon(6000, rule({ discountValue: 1000 }), NOW);
    expect(r.valid).toBe(true);
    expect(r.discountCents).toBe(600);
    expect(r.finalPriceCents).toBe(5400);
  });

  it('inativo', () => {
    expect(validateCoupon(6000, rule({ isActive: false }), NOW).reason).toBe('inactive');
  });

  it('ainda não começou', () => {
    const r = validateCoupon(6000, rule({ validFrom: new Date('2026-07-01T00:00:00Z') }), NOW);
    expect(r.reason).toBe('not_started');
  });

  it('expirado', () => {
    const r = validateCoupon(6000, rule({ validUntil: new Date('2026-06-01T00:00:00Z') }), NOW);
    expect(r.reason).toBe('expired');
  });

  it('esgotado', () => {
    const r = validateCoupon(6000, rule({ maxRedemptions: 5, timesRedeemed: 5 }), NOW);
    expect(r.reason).toBe('exhausted');
  });

  it('abaixo do mínimo', () => {
    const r = validateCoupon(3000, rule({ minOrderCents: 5000 }), NOW);
    expect(r.reason).toBe('below_min');
  });

  it('ilimitado (maxRedemptions null) não esgota', () => {
    const r = validateCoupon(6000, rule({ maxRedemptions: null, timesRedeemed: 999 }), NOW);
    expect(r.valid).toBe(true);
  });
});
