import {
  BILLING_TIERS,
  TRIAL_DAYS,
  BILLING_GRACE_DAYS,
  limitsForTier,
  PLAN_LIMITS,
  planForTier,
  priceForTier,
  subscriptionAllowsWrite,
  subscriptionAllowsPublicBooking,
  usageFitsTier,
} from './billing';

describe('billing tiers/helpers', () => {
  it('preços e janelas conforme a landing', () => {
    expect(BILLING_TIERS.free.monthly).toBe(0);
    expect(BILLING_TIERS.basic.monthly).toBe(4900);
    expect(BILLING_TIERS.basic.annual).toBe(46800);
    expect(BILLING_TIERS.pro.monthly).toBe(9900);
    expect(BILLING_TIERS.pro.annual).toBe(94800);
    expect(TRIAL_DAYS).toBe(14);
    expect(BILLING_GRACE_DAYS).toBe(7);
  });

  it('requiresCard: free não, pagos sim', () => {
    expect(BILLING_TIERS.free.requiresCard).toBe(false);
    expect(BILLING_TIERS.basic.requiresCard).toBe(true);
    expect(BILLING_TIERS.pro.requiresCard).toBe(true);
  });

  it('priceForTier por tier × ciclo', () => {
    expect(priceForTier('free', 'monthly')).toBe(0);
    expect(priceForTier('free', 'annual')).toBe(0);
    expect(priceForTier('basic', 'annual')).toBe(46800);
    expect(priceForTier('pro', 'monthly')).toBe(9900);
  });

  it('planForTier devolve frequência do MP + requiresCard', () => {
    expect(planForTier('basic', 'monthly')).toMatchObject({
      priceCents: 4900,
      mpFrequency: 1,
      mpFrequencyType: 'months',
      requiresCard: true,
    });
    expect(planForTier('pro', 'annual')).toMatchObject({
      priceCents: 94800,
      mpFrequency: 12,
      mpFrequencyType: 'months',
      requiresCard: true,
    });
    expect(planForTier('free', 'monthly')).toMatchObject({ priceCents: 0, requiresCard: false });
  });

  it('gating: libera trialing/active/past_due, bloqueia suspended/cancelled', () => {
    for (const s of ['trialing', 'active', 'past_due'] as const) {
      expect(subscriptionAllowsWrite(s)).toBe(true);
      expect(subscriptionAllowsPublicBooking(s)).toBe(true);
    }
    for (const s of ['suspended', 'cancelled'] as const) {
      expect(subscriptionAllowsWrite(s)).toBe(false);
      expect(subscriptionAllowsPublicBooking(s)).toBe(false);
    }
  });
});

describe('PLAN_LIMITS', () => {
  it('define os tetos por tier', () => {
    expect(PLAN_LIMITS.free).toEqual({ maxUnits: 1, maxEmployeesPerUnit: 2 });
    expect(PLAN_LIMITS.basic).toEqual({ maxUnits: 2, maxEmployeesPerUnit: 5 });
    expect(PLAN_LIMITS.pro).toEqual({ maxUnits: 5, maxEmployeesPerUnit: 15 });
    expect(limitsForTier('basic')).toEqual({ maxUnits: 2, maxEmployeesPerUnit: 5 });
  });
});

describe('usageFitsTier', () => {
  it('cabe quando uso <= teto', () => {
    expect(usageFitsTier('basic', { units: 2, maxEmployeesInAnyUnit: 5 })).toBe(true);
    expect(usageFitsTier('free', { units: 1, maxEmployeesInAnyUnit: 2 })).toBe(true);
  });

  it('não cabe quando unidades ou funcionários excedem', () => {
    expect(usageFitsTier('free', { units: 2, maxEmployeesInAnyUnit: 1 })).toBe(false);
    expect(usageFitsTier('basic', { units: 1, maxEmployeesInAnyUnit: 6 })).toBe(false);
  });
});
