import { z } from 'zod';

import { uuidSchema } from './common';

/**
 * Replace-all: barbeiro envia lista completa dos service IDs que ele atende.
 * Backend faz delete + createMany na mesma tx.
 */
export const replaceMyCapabilitiesSchema = z.object({
  serviceIds: z.array(uuidSchema),
});

export type ReplaceMyCapabilitiesInput = z.infer<typeof replaceMyCapabilitiesSchema>;

/**
 * Item da listagem GET /me/services — cada service + flag se faço esse.
 * Service já vem na resposta (não precisa join no cliente).
 */
export interface MyServiceItem {
  service: {
    id: string;
    name: string;
    description: string | null;
    durationMin: number;
    basePriceCents: number;
  };
  mine: boolean;
}
