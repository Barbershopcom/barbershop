import { AsyncLocalStorage } from 'node:async_hooks';

import type { Prisma } from '@prisma/client';

/**
 * Contexto por-request setado pelo TenantInterceptor.
 * - userId: sempre presente em rota autenticada
 * - tenantId: presente apenas se a request resolveu um tenant específico
 *   (via header X-Tenant-Id, path :tenantId, ou outro mecanismo)
 * - tx: PrismaClient transacional com SET LOCAL ROLE app_user + GUCs aplicados.
 *   Toda query tenant-scoped DEVE usar esse tx (não o PrismaService global),
 *   senão RLS é bypassada pelo role neondb_owner.
 */
export interface TenantContextValue {
  userId: string;
  tenantId: string | null;
  tx: Prisma.TransactionClient;
}

const storage = new AsyncLocalStorage<TenantContextValue>();

export const TenantContext = {
  /** Retorna o contexto atual, ou undefined se fora de uma request autenticada. */
  get(): TenantContextValue | undefined {
    return storage.getStore();
  },

  /** Retorna o contexto atual ou lança se ausente. Use em handlers autenticados. */
  require(): TenantContextValue {
    const ctx = storage.getStore();
    if (!ctx) {
      throw new Error('TenantContext.require() called outside of a tenant scope');
    }
    return ctx;
  },

  /** Roda fn dentro do AsyncLocalStorage com o contexto dado. */
  run<T>(ctx: TenantContextValue, fn: () => Promise<T>): Promise<T> {
    return storage.run(ctx, fn);
  },
};
