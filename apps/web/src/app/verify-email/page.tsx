'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';

type State = 'verifying' | 'ok' | 'error';

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>('verifying');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState('error');
      return;
    }
    api
      .post<{ ok: boolean }>('/public/email/verify', { token })
      .then((r) => setState(r.ok ? 'ok' : 'error'))
      .catch(() => setState('error'));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {state === 'verifying' ? (
        <p className="text-sm text-muted-foreground">Confirmando seu email…</p>
      ) : state === 'ok' ? (
        <>
          <h1 className="text-2xl font-semibold text-emerald-700">Email confirmado! ✓</h1>
          <p className="text-sm text-muted-foreground">Sua conta está ativada.</p>
          <Link
            href="/admin"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ir para o painel
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-destructive">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Entre no painel e use “Reenviar link” pra receber um novo email de confirmação.
          </p>
          <Link
            href="/admin"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium"
          >
            Ir para o painel
          </Link>
        </>
      )}
    </main>
  );
}
