import { z } from 'zod';

/**
 * Marketplace público de descoberta de barbearias (ADR-020 §2).
 */

export const discoverQuerySchema = z.object({
  /** Busca textual por nome/slug. Vazio = lista todos os públicos. */
  q: z.string().trim().max(100).optional(),
});
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

/** Card de barbearia na lista de descoberta. */
export interface DiscoverItem {
  slug: string;
  name: string;
  ratingAvg: number | null;
  ratingCount: number;
  addressLine: string | null;
  /** Menor preço de serviço ativo (centavos), ou null se sem serviços. */
  priceFromCents: number | null;
}
