import { z } from 'zod';

import { slugSchema, timezoneSchema } from './common';

const nonEmpty = (max: number) => z.string().trim().min(2).max(max);

const tenantBlock = z.object({
  slug: slugSchema,
  name: nonEmpty(100),
  timezone: timezoneSchema.optional().default('America/Sao_Paulo'),
});

const organizationBlock = z.object({
  name: nonEmpty(100),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.string().url().optional(),
});

const brazilianStates = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
] as const;

const locationBlock = z.object({
  name: nonEmpty(100),
  addressLine1: nonEmpty(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: nonEmpty(100),
  state: z.enum(brazilianStates),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato 00000-000'),
  country: z.string().length(2).default('BR'),
});

const barbershopBlock = z.object({
  name: nonEmpty(100),
  description: z.string().trim().max(500).optional(),
});

export const createTenantOnboardingSchema = z.object({
  tenant: tenantBlock,
  organization: organizationBlock,
  location: locationBlock,
  barbershop: barbershopBlock,
});

export type CreateTenantOnboardingInput = z.infer<typeof createTenantOnboardingSchema>;

export { brazilianStates };
