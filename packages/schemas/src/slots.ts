import { z } from 'zod';

import { slugSchema, timezoneSchema, uuidSchema } from './common';

/** Data no formato YYYY-MM-DD (interpretada no timezone do tenant). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

/**
 * Query string do GET /public/tenants/:slug/slots.
 *
 * - `from`/`to`: datas no timezone do tenant. Backend converte pra
 *   instantes UTC antes de consultar appointments.
 * - Janela máxima de 14 dias enforçada como refinement abaixo.
 * - `barberId` opcional — sem ele, considera todos os barbeiros com
 *   capability pro service.
 */
export const slotsQuerySchema = z
  .object({
    serviceId: uuidSchema,
    barberId: uuidSchema.optional(),
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
      return days <= 13; // 14 dias inclusivos
    },
    { message: 'Janela máxima de 14 dias entre `from` e `to`', path: ['to'] },
  );

export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

/**
 * Um slot livre que cliente pode reservar.
 *
 * `startAt` em UTC ISO-8601 — UI formata pro timezone do tenant
 * (que vai no envelope da resposta).
 */
export const slotSchema = z.object({
  startAt: z.string().datetime(),
  barberId: uuidSchema,
  barberName: z.string(),
});

export type Slot = z.infer<typeof slotSchema>;

export const slotsResponseSchema = z.object({
  timezone: timezoneSchema,
  tenantSlug: slugSchema,
  serviceId: uuidSchema,
  serviceDurationMin: z.number().int().positive(),
  slots: z.array(slotSchema),
});

export type SlotsResponse = z.infer<typeof slotsResponseSchema>;
