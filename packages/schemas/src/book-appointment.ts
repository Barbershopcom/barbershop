import { z } from 'zod';

import { emailSchema, phoneE164Schema, uuidSchema } from './common';

/**
 * Input do POST /public/tenants/:slug/appointments.
 *
 * Cliente reserva slot. Sem auth no MVP — name+phone identificam.
 * `startAt` em UTC ISO-8601 (mesmo formato que slots retorna).
 * `endAt` é derivado server-side de service.durationMin.
 */
export const bookAppointmentSchema = z.object({
  serviceId: uuidSchema,
  barberId: uuidSchema,
  startAt: z.string().datetime({ offset: false }),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: phoneE164Schema,
  customerEmail: emailSchema.optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

/**
 * Response (201) do POST de booking.
 *
 * Não retorna PII sensível em outros endpoints — esse aqui o cliente
 * tem direito de ver pq foi ele que criou. Inclui id pra futuro
 * cancelamento self-service (Sprint 5).
 */
export const bookedAppointmentSchema = z.object({
  id: uuidSchema,
  serviceId: uuidSchema,
  barberId: uuidSchema,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.literal('booked'),
  customerName: z.string(),
  customerPhone: phoneE164Schema,
  customerEmail: emailSchema.nullable(),
});

export type BookedAppointment = z.infer<typeof bookedAppointmentSchema>;
