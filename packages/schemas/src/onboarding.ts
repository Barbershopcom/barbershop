import { z } from 'zod';

import { slugSchema, timezoneSchema } from './common';

const nonEmpty = (max: number) => z.string().trim().min(2).max(max);

/**
 * Valida CPF brasileiro pelos dois dígitos verificadores. Recebe a string
 * só com dígitos (11 chars). Rejeita sequências repetidas (000..., 111...).
 */
export function isValidCpf(digits: string): boolean {
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Number(digits[i]) * (len + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

/**
 * CPF de entrada (com ou sem máscara). Normaliza para 11 dígitos e valida
 * os dígitos verificadores. O valor de saída é sempre só dígitos.
 */
export const cpfSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine(isValidCpf, { message: 'CPF inválido' });

// Pre-processor: empty string ⇒ undefined antes da validação.
// Previne falsos negativos quando form tem default '' em campos opcionais
// com format validators (.url(), .email(), .regex(), etc).
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema,
  );

const tenantBlock = z.object({
  slug: slugSchema,
  name: nonEmpty(100),
  timezone: timezoneSchema.optional().default('America/Sao_Paulo'),
});

const organizationBlock = z.object({
  name: nonEmpty(100),
  description: emptyToUndefined(z.string().trim().max(500).optional()),
  logoUrl: emptyToUndefined(z.string().url().optional()),
});

const brazilianStates = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
] as const;

const locationBlock = z.object({
  name: nonEmpty(100),
  addressLine1: nonEmpty(200),
  addressLine2: emptyToUndefined(z.string().trim().max(200).optional()),
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
  description: emptyToUndefined(z.string().trim().max(500).optional()),
  lateCancelFeePct: z.coerce.number().int().min(0).max(100).default(50),
});

export const createTenantOnboardingSchema = z.object({
  /** CPF do responsável — usado para identidade e liberar o teste grátis
   *  uma única vez por pessoa (anti-abuso). Saída normalizada (11 dígitos). */
  ownerCpf: cpfSchema,
  tenant: tenantBlock,
  organization: organizationBlock,
  location: locationBlock,
  barbershop: barbershopBlock,
});

export type CreateTenantOnboardingInput = z.infer<typeof createTenantOnboardingSchema>;

export { brazilianStates };
