'use client';

import { useState } from 'react';

/**
 * Página pra testar que Sentry capta erros client/server (ADR-014).
 *
 * Roda só em dev — em prod o env block redireciona pra home.
 */
export default function DebugSentry() {
  const [serverError, setServerError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_DEBUG_SENTRY !== 'true') {
    return (
      <main className="mx-auto max-w-md p-8">
        <p className="text-sm text-muted-foreground">
          Endpoint desativado. Setar NEXT_PUBLIC_DEBUG_SENTRY=true pra usar.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Debug Sentry</h1>

      <button
        type="button"
        onClick={() => {
          throw new Error('Sentry client test — se aparecer no dashboard, init OK.');
        }}
        className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
      >
        Disparar erro CLIENT
      </button>

      <button
        type="button"
        onClick={async () => {
          const res = await fetch('/debug-sentry/api');
          const body = await res.text();
          setServerError(`Status: ${res.status} — ${body.slice(0, 200)}`);
        }}
        className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
      >
        Disparar erro SERVER (API route)
      </button>

      {serverError ? (
        <pre className="rounded-md bg-muted p-3 text-xs">{serverError}</pre>
      ) : null}
    </main>
  );
}
