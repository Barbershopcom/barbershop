import { z } from 'zod';

/**
 * Input do PATCH /admin/appointments/:id/reschedule.
 *
 * Mantém o id do appointment, só atualiza start_at/end_at. Dispara
 * revalidação contra SlotsService + email "remarcado" pro cliente
 * (com token novo no link de cancel).
 */
export const rescheduleAppointmentSchema = z.object({
  newStartAt: z.string().datetime(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
