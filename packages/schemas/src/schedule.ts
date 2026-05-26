import { hourRangeSchema } from './barbershop-hours';
import type { Weekday } from './barbershop-hours';
import { z } from 'zod';

/**
 * Replace-all: barbeiro envia agenda semanal completa.
 * Cada item é uma faixa de horário (manhã, tarde) em um weekday.
 * Reusa hourRangeSchema de barbershop-hours (mesma forma).
 */
export const replaceMyScheduleSchema = z.object({
  ranges: z.array(hourRangeSchema),
});

export type ReplaceMyScheduleInput = z.infer<typeof replaceMyScheduleSchema>;

export interface MyScheduleItem {
  id: string;
  weekday: Weekday;
  opensAt: string;
  closesAt: string;
}
