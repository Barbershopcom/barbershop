import { z } from 'zod';

import { isoDateSchema } from './slots';

/**
 * Query string do GET /me/appointments. Datas no formato YYYY-MM-DD,
 * interpretadas no timezone do tenant do barbeiro (backend resolve).
 *
 * Janela máxima: 31 dias (visão de calendário mensal max).
 */
export const myAppointmentsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((q) => q.from <= q.to, {
    message: '`from` deve ser <= `to`',
    path: ['from'],
  })
  .refine(
    (q) => {
      const fromMs = Date.UTC(
        Number(q.from.slice(0, 4)),
        Number(q.from.slice(5, 7)) - 1,
        Number(q.from.slice(8, 10)),
      );
      const toMs = Date.UTC(
        Number(q.to.slice(0, 4)),
        Number(q.to.slice(5, 7)) - 1,
        Number(q.to.slice(8, 10)),
      );
      const days = Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
      return days <= 30;
    },
    { message: 'Janela máxima de 31 dias entre `from` e `to`', path: ['to'] },
  );

export type MyAppointmentsQuery = z.infer<typeof myAppointmentsQuerySchema>;

/**
 * Item da lista "meus appointments" — visão do barbeiro.
 * Inclui dados do cliente (nome, telefone) e do serviço pra UI mostrar
 * sem precisar de joins separados.
 */
export interface MyAppointmentItem {
  id: string;
  startAt: string; // UTC ISO
  endAt: string; // UTC ISO
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  customerName: string;
  customerPhone: string | null;
  service: {
    id: string;
    name: string;
    durationMin: number;
  };
}
