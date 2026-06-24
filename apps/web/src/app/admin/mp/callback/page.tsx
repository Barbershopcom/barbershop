'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveTenant } from '@/lib/active-tenant';
import { api, ApiError } from '@/lib/api';

type State =
  | { kind: 'processing' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

/**
 * Callback do OAuth do Mercado Pago Connect (ADR-022 §2). O MP redireciona
 * pra cá com ?code&state após o admin autorizar. Trocamos o code por tokens
 * via POST /admin/mp/connect e voltamos pra tela de Pagamentos.
 */
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { tenant } = useActiveTenant();
  const [state, setState] = useState<State>({ kind: 'processing' });
  // StrictMode monta o efeito 2x em dev; evita trocar o code duas vezes.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = params.get('code');
    const stateParam = params.get('state');
    const mpError = params.get('error');

    if (mpError) {
      setState({ kind: 'error', message: `Mercado Pago retornou um erro: ${mpError}` });
      return;
    }
    if (!code || !stateParam) {
      setState({ kind: 'error', message: 'Retorno inválido do Mercado Pago (faltou code/state).' });
      return;
    }

    api
      .post('/admin/mp/connect', { code, state: stateParam }, { tenantId: tenant.id })
      .then(() => {
        setState({ kind: 'success' });
        setTimeout(() => router.replace('/admin/pagamentos'), 1500);
      })
      .catch((err: unknown) => {
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Falha ao conectar a conta Mercado Pago.',
        });
      });
  }, [params, router, tenant.id]);

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conectando ao Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {state.kind === 'processing' ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Finalizando a conexão…
            </div>
          ) : null}

          {state.kind === 'success' ? (
            <div className="flex items-center gap-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Conta conectada! Redirecionando…
            </div>
          ) : null}

          {state.kind === 'error' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {state.message}
              </div>
              <Button variant="outline" onClick={() => router.replace('/admin/pagamentos')}>
                Voltar para Pagamentos
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MpCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
