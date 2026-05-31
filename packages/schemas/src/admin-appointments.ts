import { z } from 'zod';

import type { AppointmentStatus } from './appointments';
import { uuidSchema } from './common';
import { isoDateSchema } from './slots';

/**
 * Query do GET /admin/appointments — visão da tela admin/agenda no web.
 *
 * - Janela max 31 dias (mesma regra do /me/appointments)
 * - Filtros opcionais: barberId, status (default = booked apenas)
 * - includeAllStatuses=true desliga o filtro de status
 */
export const adminAppointmentsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    barberId: uuidSchema.optional(),
    includeAllStatuses: z.coerce.boolean().optional().default(false),
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

export type AdminAppointmentsQuery = z.infer<typeof adminAppointmentsQuerySchema>;

export interface AdminAppointmentItem {
  id: string;
  startAt: string; // UTC ISO
  endAt: string; // UTC ISO
  status: AppointmentStatus;
  cancelledBy: 'customer' | 'admin' | 'system' | null;
  cancelReason: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  service: { id: string; name: string; durationMin: number };
  barber: { id: string; displayName: string };
}
