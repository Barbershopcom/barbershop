import { createTenantOnboardingSchema } from './onboarding';

const base = {
  ownerCpf: '529.982.247-25',
  tenant: { slug: 'barbearia-x', name: 'Barbearia X' },
  organization: { name: 'Org X' },
  location: { name: 'Matriz', addressLine1: 'Rua 1', city: 'Rio', state: 'RJ', postalCode: '20000-000' },
  barbershop: { name: 'Barbearia X', lateCancelFeePct: 15 },
};

describe('createTenantOnboardingSchema billing', () => {
  it('rejeita sem billingCycle/cardTokenId', () => {
    expect(createTenantOnboardingSchema.safeParse(base).success).toBe(false);
  });
  it('aceita com billingCycle e cardTokenId', () => {
    const r = createTenantOnboardingSchema.safeParse({ ...base, billingCycle: 'annual', cardTokenId: 'tok_123' });
    expect(r.success).toBe(true);
  });
});
