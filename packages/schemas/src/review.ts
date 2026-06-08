import { z } from 'zod';

import { uuidSchema } from './common';

/**
 * Avaliações de cortes concluídos (ADR-019). rating 1..5 + comentário.
 */

export const ratingSchema = z.number().int().min(1).max(5);

/** Cliente cria review de um appointment completed. */
export const createReviewSchema = z.object({
  appointmentId: uuidSchema,
  rating: ratingSchema,
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/** Cliente edita a própria review. */
export const updateReviewSchema = z
  .object({
    rating: ratingSchema.optional(),
    comment: z.string().trim().max(1000).nullish(),
  })
  .refine((q) => q.rating !== undefined || q.comment !== undefined, {
    message: 'Informe `rating` e/ou `comment`.',
  });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/** Rating agregado (barbeiro ou barbearia). */
export interface RatingStats {
  /** Média 1..5 arredondada a 1 casa, ou null se sem reviews. */
  avg: number | null;
  count: number;
}

/** Review na visão do CLIENTE (a sua própria), com contexto do corte. */
export interface MyReviewItem {
  id: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  barberName: string;
  serviceName: string;
  tenantName: string;
  /** startAt do appointment avaliado. */
  appointmentAt: string;
}

/** Review na visão do BARBEIRO (sobre si), ou pública (na barbearia). */
export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Primeiro nome do cliente (privacidade — não expõe nome completo). */
  customerFirstName: string;
  serviceName: string;
}
