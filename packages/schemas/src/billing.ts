export const TRIAL_DAYS = 14;
export const BILLING_GRACE_DAYS = 7;

export const BILLING_PLAN = {
  monthly: { cycle: 'monthly', priceCents: 9990, mpFrequency: 1, mpFrequencyType: 'months' },
  annual: { cycle: 'annual', priceCents: 99900, mpFrequency: 12, mpFrequencyType: 'months' },
} as const;

export type BillingCycle = keyof typeof BILLING_PLAN; // 'monthly' | 'annual'
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export function planForCycle(cycle: BillingCycle) {
  return BILLING_PLAN[cycle];
}

const ALLOWED = new Set<SubscriptionStatus>(['trialing', 'active', 'past_due']);
export function subscriptionAllowsWrite(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
export function subscriptionAllowsPublicBooking(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
