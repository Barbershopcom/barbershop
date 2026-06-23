import { z } from 'zod';

import { phoneE164Schema } from './common';

/**
 * Body do PATCH `/admin/tenants/me` — admin atualiza perfil público
 * da barbearia (ADR-012). Todos os campos são opcionais; null limpa.
 */
export const updateTenantProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  /** Opt-in do marketplace de descoberta (ADR-020 §1). */
  listedPublicly: z.boolean().optional(),
  phoneE164: phoneE164Schema.nullable().optional(),
  addressLine: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  instagramHandle: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return v ?? null;
      // Aceita "@handle" ou "handle" — normaliza removendo @
      const cleaned = v.startsWith('@') ? v.slice(1) : v;
      return cleaned === '' ? null : cleaned;
    })
    .pipe(
      z
        .string()
        .regex(/^[A-Za-z0-9_.]{1,30}$/, 'Instagram handle inválido (letras, números, _ e .)')
        .nullable(),
    ),
  lateCancelFeePct: z.coerce.number().int().min(0).max(100).optional(),
});

export type UpdateTenantProfileInput = z.infer<typeof updateTenantProfileSchema>;
