import { z } from 'zod';

import { phoneE164Schema } from './common';

/**
 * Perfil do cliente final logado (mobile-customer). 1:1 com Customer
 * (ADR-016 §2). Usado pra pré-preencher o checkout — nome/telefone são
 * capturados uma vez e reusados nas reservas seguintes.
 */
export interface MyCustomerProfile {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  completedCutsCount: number;
}

/**
 * PATCH /me/customer — edita nome e/ou telefone do próprio perfil.
 * Ambos opcionais (cliente pode salvar só o telefone no 1º checkout).
 */
export const updateMyCustomerSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  phoneE164: phoneE164Schema.optional(),
});

export type UpdateMyCustomerInput = z.infer<typeof updateMyCustomerSchema>;
