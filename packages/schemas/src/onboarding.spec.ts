import { createTenantOnboardingSchema } from './onboarding';

const base = {
  ownerCpf: '529.982.247-25',
  tenant: { slug: 'barbearia-x', name: 'Barbearia X' },
  organization: { name: 'Org X' },
  location: { name: 'Matriz', addressLine1: 'Rua 1', city: 'Rio', state: 'RJ', postalCode: '20000-000' },
  barbershop: { name: 'Barbearia X', lateCancelFeePct: 15 },
};

describe('createTenantOnboardingSchema tiers', () => {
  it('free não exige cardTokenId', () => {
    const r = createTenantOnboardingSchema.safeParse({
      ...base,
      tier: 'free',
      billingCycle: 'monthly',
    });
    expect(r.success).toBe(true);
  });

  it('basic/pro exigem cardTokenId', () => {
    const semCartao = createTenantOnboardingSchema.safeParse({
      ...base,
      tier: 'basic',
      billingCycle: 'monthly',
    });
    expect(semCartao.success).toBe(false);

    const comCartao = createTenantOnboardingSchema.safeParse({
      ...base,
      tier: 'pro',
      billingCycle: 'annual',
      cardTokenId: 'tok_123',
    });
    expect(comCartao.success).toBe(true);
  });

  it('rejeita tier inválido', () => {
    const r = createTenantOnboardingSchema.safeParse({
      ...base,
      tier: 'enterprise',
      billingCycle: 'monthly',
    });
    expect(r.success).toBe(false);
  });
});
