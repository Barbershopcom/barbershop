import { z } from 'zod';

/**
 * Body opcional do PATCH /admin/appointments/:id/cancel.
 *
 * Admin pode informar motivo livre ("cliente ligou", "barbeiro doente"),
 * que vai pra coluna cancel_reason. Mostrado na visão admin quando
 * incluir cancelados.
 */
export const adminCancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export type AdminCancelAppointmentInput = z.infer<typeof adminCancelAppointmentSchema>;
