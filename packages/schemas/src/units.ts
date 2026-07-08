import { z } from 'zod';

import { slugSchema } from './common';
import type { PlanTier } from './billing';

/**
 * Unidades (barbershops) do tenant — multi-unidade (spec 2026-07-07).
 * O teto de unidades vem do tier da assinatura (PLAN_LIMITS).
 */
export const createUnitSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().toUpperCase().length(2),
  postalCode: z.string().trim().min(8).max(9),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export interface UnitDto {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  addressLine1: string;
  city: string;
  employeeCount: number;
}

export interface UnitsResponse {
  units: UnitDto[];
  limit: number;
  tier: PlanTier;
}
