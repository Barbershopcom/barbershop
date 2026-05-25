import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { api, ApiError } from './api';
import { getSupabase } from './supabase';

export interface EmployeeProfile {
  id: string;
  displayName: string;
  email: string | null;
  role: 'admin' | 'barber' | 'admin_barber';
  isActive: boolean;
}

export interface BarbershopInfo {
  id: string;
  name: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

interface MeEmployeeResponse {
  employee: EmployeeProfile;
  barbershop: BarbershopInfo | null;
  tenant: TenantInfo | null;
  roles: string[];
}

/**
 * State machine de autenticação:
 *   loading      → checando sessão no AsyncStorage (cold start)
 *   anonymous    → sem sessão Supabase, mostrar /login
 *   linking      → tem sessão, chamando /me/employee/link
 *   linked       → tudo ok, app pode abrir
 *   link-failed  → tem sessão mas backend rejeitou (sem employee com email,
 *                  conflito, ou erro de rede). Mostrar tela /sem-vinculo.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'linking'; session: Session }
  | {
      status: 'linked';
      session: Session;
      employee: EmployeeProfile;
      barbershop: BarbershopInfo | null;
      tenant: TenantInfo | null;
      roles: string[];
    }
  | { status: 'link-failed'; session: Session; message: string };

interface SignInResult {
  ok: boolean;
  error?: string;
}

interface SessionContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  retryLink: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession() deve ser usado dentro de <SessionProvider>');
  }
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  async function attemptLink(session: Session): Promise<void> {
    setState({ status: 'linking', session });
    try {
      // POST /me/employee/link é idempotente — funciona se já vinculado
      // E sincroniza roles de membership com employee.role atual.
      const linked = await api.post<MeEmployeeResponse>('/me/employee/link');
      setState({
        status: 'linked',
        session,
        employee: linked.employee,
        barbershop: linked.barbershop,
        tenant: linked.tenant,
        roles: linked.roles,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro inesperado ao buscar perfil.';
      setState({ status: 'link-failed', session, message });
    }
  }

  useEffect(() => {
    const supabase = getSupabase();

    // 1) Checa sessão persistida no AsyncStorage (cold start)
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void attemptLink(data.session);
      } else {
        setState({ status: 'anonymous' });
      }
    });

    // 2) Observa mudanças (login, logout, refresh token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void attemptLink(session);
      } else {
        setState({ status: 'anonymous' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    // onAuthStateChange acima dispara attemptLink automaticamente.
    return { ok: true };
  }

  async function signOut(): Promise<void> {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    // onAuthStateChange seta status=anonymous.
  }

  async function retryLink(): Promise<void> {
    if (state.status === 'link-failed' || state.status === 'linking') {
      await attemptLink(state.session);
    }
  }

  return (
    <SessionContext.Provider value={{ state, signIn, signOut, retryLink }}>
      {children}
    </SessionContext.Provider>
  );
}
