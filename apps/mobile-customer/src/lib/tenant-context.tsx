import { useURL } from 'expo-linking';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api } from './api';
import { extractSlugFromPath, loadPersistedSlug, persistSlug } from './tenant-slug';

export interface Tenant {
  slug: string;
  barbershopId: string;
  name: string;
  ratingAvg: number | null;
}

export type TenantState =
  | { status: 'loading' }
  | { status: 'no-tenant' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; tenant: Tenant };

/**
 * Shape do endpoint GET /public/tenants/:slug.
 * O backend retorna `id` (campo primário do Barbershop).
 * Mapeamos para `barbershopId` para uso interno no app.
 */
interface PublicTenantDto {
  /** UUID do barbershop (campo `id` na resposta HTTP). */
  id: string;
  slug: string;
  name: string;
  ratingAvg: number | null;
}

const TenantContext = createContext<TenantState | null>(null);

export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant() deve ser usado dentro de <TenantProvider>');
  return ctx;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const url = useURL();
  const [state, setState] = useState<TenantState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const resolve = useCallback(async () => {
    setState({ status: 'loading' });
    const fromLink = extractSlugFromPath(url);
    if (fromLink) await persistSlug(fromLink);
    const tenantSlug = fromLink ?? (await loadPersistedSlug());
    if (!tenantSlug) {
      setState({ status: 'no-tenant' });
      return;
    }
    try {
      const dto = await api.get<PublicTenantDto>(
        `/public/tenants/${encodeURIComponent(tenantSlug)}`,
      );
      setState({
        status: 'ready',
        tenant: {
          slug: dto.slug,
          // Real backend returns `id`; map to barbershopId for downstream use.
          barbershopId: dto.id,
          name: dto.name,
          ratingAvg: dto.ratingAvg,
        },
      });
    } catch {
      setState({ status: 'error', retry: () => setAttempt((a) => a + 1) });
    }
  }, [url, attempt]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  return <TenantContext.Provider value={state}>{children}</TenantContext.Provider>;
}
