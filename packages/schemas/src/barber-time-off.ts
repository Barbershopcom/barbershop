import { z } from 'zod';

import { uuidSchema } from './common';

/**
 * BarberTimeOff = período em que um barbeiro está indisponível
 * (férias, folga, doença). Sem recorrência no MVP — admin marca
 * cada período manualmente.
 */

const isoDateTimeSchema = z.string().datetime();

export const createBarberTimeOffSchema = z
  .object({
    barberId: uuidSchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    reason: z.string().trim().max(500).optional(),
    /**
     * Se true, ao criar, backend cancela todos os appointments booked
     * no overlap e dispara emails. Default true.
     * Front-end manda false só se já mostrou modal e admin confirmou
     * que NÃO quer cancelar.
     */
    cancelOverlapping: z.boolean().optional().default(true),
  })
  .refine((q) => new Date(q.startAt) < new Date(q.endAt), {
    message: '`startAt` deve ser antes de `endAt`',
    path: ['startAt'],
  });

export type CreateBarberTimeOffInput = z.infer<typeof createBarberTimeOffSchema>;

export const updateBarberTimeOffSchema = z
  .object({
    startAt: isoDateTimeSchema.optional(),
    endAt: isoDateTimeSchema.optional(),
    reason: z.string().trim().max(500).nullish(),
  })
  .refine(
    (q) => {
      if (q.startAt && q.endAt) return new Date(q.startAt) < new Date(q.endAt);
      return true;
    },
    { message: '`startAt` deve ser antes de `endAt`', path: ['startAt'] },
  );

export type UpdateBarberTimeOffInput = z.infer<typeof updateBarberTimeOffSchema>;

export interface BarberTimeOffDto {
  id: string;
  barberId: string;
  startAt: string; // UTC ISO
  endAt: string; // UTC ISO
  reason: string | null;
  createdAt: string;
}

/**
 * Response de "criar TimeOff" inclui contagem dos appointments cancelados
 * (se cancelOverlapping=true). UI mostra "N agendamentos cancelados" no toast.
 */
export interface CreateBarberTimeOffResponse {
  timeOff: BarberTimeOffDto;
  cancelledAppointmentsCount: number;
}

/**
 * Pre-flight check: front-end chama ANTES de criar TimeOff pra saber
 * quantos appointments vão ser cancelados, mostra modal de confirmação,
 * só então POSTa a criação.
 */
export const previewTimeOffQuerySchema = z
  .object({
    barberId: uuidSchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
  })
  .refine((q) => new Date(q.startAt) < new Date(q.endAt), {
    message: '`startAt` deve ser antes de `endAt`',
    path: ['startAt'],
  });

export type PreviewTimeOffQuery = z.infer<typeof previewTimeOffQuerySchema>;

export interface PreviewTimeOffResponse {
  overlappingCount: number;
  appointments: Array<{
    id: string;
    startAt: string;
    customerName: string;
    serviceName: string;
  }>;
}
