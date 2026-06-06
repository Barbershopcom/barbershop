import { z } from 'zod';

/**
 * Ações do barbeiro sobre um appointment pending (ADR-017 §3).
 */

/** Body opcional do reject — motivo livre mostrado ao cliente. */
export const rejectAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type RejectAppointmentInput = z.infer<typeof rejectAppointmentSchema>;

/** Resposta das ações confirm/reject. */
export interface BarberActionResult {
  id: string;
  status: 'confirmed' | 'cancelled';
}
