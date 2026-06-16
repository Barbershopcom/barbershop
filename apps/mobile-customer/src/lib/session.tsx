import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { getSupabase } from './supabase';

/**
 * Session do mobile-customer. **Guest-first** (ADR-010 §1):
 *
 * - `anonymous` é o estado default e válido — usuário pode usar o app
 *   inteiro sem login. Login desbloqueia histórico + cancel in-app.
 * - Não chama /me/employee/link (esse endpoint é do mobile-business).
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; session: Session };

interface SignInResult {
  ok: boolean;
  error?: string;
}

interface SessionContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInResult>;
  signInWithApple: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabase();
    } catch {
      // Env Supabase não configurado — fica guest pra sempre. App ainda
      // funciona pra booking público.
      setState({ status: 'anonymous' });
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setState(
        data.session
          ? { status: 'authenticated', session: data.session }
          : { status: 'anonymous' },
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'authenticated', session }
          : { status: 'anonymous' },
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro inesperado',
      };
    }
  }

  async function signUp(email: string, password: string): Promise<SignInResult> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro inesperado',
      };
    }
  }

  async function signInWithGoogle(): Promise<SignInResult> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao conectar com Google',
      };
    }
  }

  async function signInWithApple(): Promise<SignInResult> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao conectar com Apple',
      };
    }
  }

  async function signOut(): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {
      // Sem supabase config — sign out é no-op.
      setState({ status: 'anonymous' });
    }
  }

  return (
    <SessionContext.Provider value={{ state, signIn, signUp, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
