import { z } from 'zod';

/**
 * Folgas self-service do barbeiro (ADR-018 §6). barberId é implícito
 * (o próprio barbeiro logado) — diferente do admin que passa barberId.
 */
const isoDateTimeSchema = z.string().datetime();

export const createMyTimeOffSchema = z
  .object({
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .refine((q) => new Date(q.startAt) >= new Date(), {
    message: '`startAt` deve ser no futuro',
    path: ['startAt'],
  })
  .refine((q) => new Date(q.startAt) < new Date(q.endAt), {
    message: '`startAt` deve ser antes de `endAt`',
    path: ['startAt'],
  });

export type CreateMyTimeOffInput = z.infer<typeof createMyTimeOffSchema>;

export interface MyTimeOffDto {
  id: string;
  startAt: string; // UTC ISO
  endAt: string; // UTC ISO
  reason: string | null;
}

export interface CreateMyTimeOffResponse {
  timeOff: MyTimeOffDto;
  /** Appointments ativos no range que foram cancelados (+ estornados). */
  cancelledAppointmentsCount: number;
}
