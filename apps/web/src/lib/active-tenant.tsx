'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api, ApiError } from '@/lib/api';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

interface MembershipResponse {
  tenant: Tenant;
  roles: string[];
  joinedAt: string;
}

interface ActiveTenantContextValue {
  tenant: Tenant;
  roles: string[];
  refresh: () => Promise<void>;
}

const ActiveTenantContext = createContext<ActiveTenantContextValue | null>(null);

export function useActiveTenant(): ActiveTenantContextValue {
  const ctx = useContext(ActiveTenantContext);
  if (!ctx) {
    throw new Error('useActiveTenant() must be used inside <ActiveTenantProvider>');
  }
  return ctx;
}

/**
 * Resolve o tenant ativo do user logado.
 * - Sem tenant → redireciona pra /onboarding.
 * - Sem sessão Supabase → redireciona pra /login.
 * - Múltiplos tenants → pega o primeiro (UI de troca fica pro Sprint 8+).
 */
export function ActiveTenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; tenant: Tenant; roles: string[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  async function load() {
    try {
      const memberships = await api.get<MembershipResponse[]>('/me/tenants');
      if (memberships.length === 0) {
        router.replace('/onboarding');
        return;
      }
      const first = memberships[0];
      if (!first) {
        router.replace('/onboarding');
        return;
      }
      setState({ status: 'ready', tenant: first.tenant, roles: first.roles });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Erro ao carregar tenant',
      });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-destructive">
        {state.message}
      </div>
    );
  }

  return (
    <ActiveTenantContext.Provider
      value={{ tenant: state.tenant, roles: state.roles, refresh: load }}
    >
      {children}
    </ActiveTenantContext.Provider>
  );
}
