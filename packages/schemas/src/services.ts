import { z } from 'zod';

// Preço em centavos: R$ 0,00 a R$ 100.000,00
const priceCentsSchema = z.coerce.number().int().min(0).max(100_000_00);

// Duração: 5 min a 8 horas
const durationMinSchema = z.coerce.number().int().min(5).max(8 * 60);

// Buffer pós-appointment: 0 a 4 horas. Casa com CHECK do schema.
const bufferMinSchema = z.coerce.number().int().min(0).max(240);

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
  durationMin: durationMinSchema,
  bufferMin: bufferMinSchema.optional().default(0),
  basePriceCents: priceCentsSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(500).nullish(),
  ),
  durationMin: durationMinSchema.optional(),
  bufferMin: bufferMinSchema.optional(),
  basePriceCents: priceCentsSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  bufferMin: number;
  basePriceCents: number;
  isActive: boolean;
  barbershopId: string;
  createdAt: string;
  updatedAt: string;
}
