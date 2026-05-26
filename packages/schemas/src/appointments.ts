import { z } from 'zod';

import { phoneE164Schema, uuidSchema } from './common';

/**
 * Status do appointment. Slots subtraem só 'booked'.
 *  - cancelled: cliente desmarcou (libera o horário)
 *  - completed: confirmado após o horário (não bloqueia futuras buscas)
 *  - no_show: cliente não apareceu (também libera, mas marca histórico)
 */
export const appointmentStatusSchema = z.enum([
  'booked',
  'cancelled',
  'completed',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/**
 * Schema do appointment como entidade (output). Datas em ISO 8601 UTC.
 * Phone opcional — cliente pode reservar sem (Sprint 8 vai exigir auth).
 */
export const appointmentSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  barbershopId: uuidSchema,
  barberId: uuidSchema,
  serviceId: uuidSchema,
  customerName: z.string().min(2).max(120),
  customerPhone: phoneE164Schema.nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: appointmentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Appointment = z.infer<typeof appointmentSchema>;
