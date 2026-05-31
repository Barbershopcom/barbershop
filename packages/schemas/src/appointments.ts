import { z } from 'zod';

import { phoneE164Schema, uuidSchema } from './common';

/**
 * Status do appointment — workflow novo (ADR-016 §3). Fonte canônica.
 *  - awaiting_payment: reservou, não pagou ainda (segura o slot)
 *  - pending: pago, aguardando barbeiro confirmar
 *  - confirmed: barbeiro confirmou
 *  - completed: corte realizado
 *  - cancelled: cancelado (libera o horário)
 *  - expired: barbeiro não confirmou e a hora passou (reembolso)
 *  - no_show: cliente não apareceu
 *
 * Slots/EXCLUDE ocupam apenas awaiting_payment|pending|confirmed
 * (ver `slotOccupyingStatuses` em ./payment).
 */
export const appointmentStatusSchema = z.enum([
  'awaiting_payment',
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'expired',
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
