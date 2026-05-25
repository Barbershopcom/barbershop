import { z } from 'zod';

// 0=Domingo, 1=Segunda, ..., 6=Sábado
export const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof weekdays)[number];

export const weekdayLabels: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

// HH:MM (24h)
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM (24h)');

export const hourRangeSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    opensAt: timeSchema,
    closesAt: timeSchema,
  })
  .refine((v) => v.opensAt < v.closesAt, {
    message: 'Hora de abertura deve ser anterior ao fechamento',
    path: ['closesAt'],
  });

// Replace-all: payload completo da semana, API substitui.
export const replaceHoursSchema = z.object({
  ranges: z.array(hourRangeSchema),
});

export type HourRange = z.infer<typeof hourRangeSchema>;
export type ReplaceHoursInput = z.infer<typeof replaceHoursSchema>;

export interface BarbershopHoursDto {
  id: string;
  weekday: Weekday;
  opensAt: string;
  closesAt: string;
  barbershopId: string;
}
