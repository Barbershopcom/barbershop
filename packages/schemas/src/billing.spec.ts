import {
  BILLING_PLAN, TRIAL_DAYS, BILLING_GRACE_DAYS,
  planForCycle, subscriptionAllowsWrite, subscriptionAllowsPublicBooking,
} from './billing';

describe('billing constants/helpers', () => {
  it('preços e janelas conforme spec', () => {
    expect(BILLING_PLAN.monthly.priceCents).toBe(9990);
    expect(BILLING_PLAN.annual.priceCents).toBe(99900);
    expect(TRIAL_DAYS).toBe(14);
    expect(BILLING_GRACE_DAYS).toBe(7);
  });
  it('planForCycle devolve frequência do MP', () => {
    expect(planForCycle('monthly')).toMatchObject({ priceCents: 9990, mpFrequency: 1, mpFrequencyType: 'months' });
    expect(planForCycle('annual')).toMatchObject({ priceCents: 99900, mpFrequency: 12, mpFrequencyType: 'months' });
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
