export const TRIAL_DAYS = 14; // só tiers pagos
export const BILLING_GRACE_DAYS = 7;

export type BillingCycle = 'monthly' | 'annual';
export type PlanTier = 'free' | 'basic' | 'pro';
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';

/**
 * Catálogo de planos por tier (espelha a landing). `monthly`/`annual` são o
 * priceCents COBRADO em cada ciclo: anual = mensal −20%, cobrado uma vez/ano.
 * Free é R$0 em qualquer ciclo e não exige cartão.
 */
export const BILLING_TIERS = {
  free: { tier: 'free', monthly: 0, annual: 0, requiresCard: false },
  basic: { tier: 'basic', monthly: 4900, annual: 46800, requiresCard: true },
  pro: { tier: 'pro', monthly: 9900, annual: 94800, requiresCard: true },
} as const satisfies Record<PlanTier, {
  tier: PlanTier;
  monthly: number;
  annual: number;
  requiresCard: boolean;
}>;

/** priceCents pro par (tier, ciclo). Free = 0 em qualquer ciclo. */
export function priceForTier(tier: PlanTier, cycle: BillingCycle): number {
  return BILLING_TIERS[tier][cycle];
}

/** Dados pro charge do preapproval: mensal = freq 1 mês; anual = freq 12 meses. */
export function planForTier(
  tier: PlanTier,
  cycle: BillingCycle,
): { priceCents: number; mpFrequency: number; mpFrequencyType: 'months'; requiresCard: boolean } {
  return {
    priceCents: priceForTier(tier, cycle),
    mpFrequency: cycle === 'annual' ? 12 : 1,
    mpFrequencyType: 'months',
    requiresCard: BILLING_TIERS[tier].requiresCard,
  };
}

const ALLOWED = new Set<SubscriptionStatus>(['trialing', 'active', 'past_due']);
export function subscriptionAllowsWrite(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
export function subscriptionAllowsPublicBooking(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
