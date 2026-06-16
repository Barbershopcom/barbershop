import { z } from 'zod';

import { emailSchema, phoneE164Schema, uuidSchema } from './common';

/**
 * Input do POST /admin/appointments — admin reserva pra cliente que ligou.
 *
 * Sem Idempotency-Key (admin não retenta via API), sem throttle agressivo.
 * Telefone OPCIONAL (público sempre exige). Email opcional.
 *
 * Revalida slot igual ao público.
 */
export const adminCreateAppointmentSchema = z
  .object({
    serviceId: uuidSchema,
    barberId: uuidSchema,
    startAt: z.string().datetime(),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: phoneE164Schema.optional().nullable(),
    customerEmail: emailSchema.optional().nullable(),
  })
  .refine((data) => new Date(data.startAt) > new Date(), {
    message: 'startAt deve ser no futuro.',
    path: ['startAt'],
  });

export type AdminCreateAppointmentInput = z.infer<typeof adminCreateAppointmentSchema>;
