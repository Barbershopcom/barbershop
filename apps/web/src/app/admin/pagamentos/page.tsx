'use client';

import { CheckCircle2, ExternalLink, Link2, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';

interface MpStatus {
  connected: boolean;
  mpUserId: string | null;
  connectedAt: string | null;
}

export default function PagamentosPage() {
  const [status, setStatus] = useState<MpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const data = await api.get<MpStatus>('/admin/mp/status');
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar status do Mercado Pago.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleConnect() {
    setError(null);
    setActing(true);
    try {
      const { url } = await api.get<{ url: string }>('/admin/mp/connect-url');
      // Redireciona o admin pro Mercado Pago pra autorizar; volta no /admin/mp/callback.
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar a conexão.');
      setActing(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setActing(true);
    try {
      await api.post('/admin/mp/disconnect');
      await loadStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível desconectar.');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte a conta Mercado Pago da sua barbearia para receber os
          pagamentos dos clientes. A plataforma retém uma comissão por
          agendamento; o restante cai direto na sua conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta Mercado Pago</CardTitle>
          <CardDescription>
            Você será redirecionado ao Mercado Pago para autorizar a conexão.
            Nenhuma senha sua passa pela plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando status…</p>
          ) : status?.connected ? (
            <div className="flex items-start gap-3 rounded-md bg-emerald-50 px-3 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm">
                <p className="font-medium text-emerald-800">Conta conectada</p>
                <p className="text-emerald-700">
                  {status.mpUserId ? `ID Mercado Pago: ${status.mpUserId}` : null}
                  {status.connectedAt
                    ? ` · desde ${new Date(status.connectedAt).toLocaleDateString('pt-BR')}`
                    : null}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
              Nenhuma conta conectada. Os pagamentos só funcionam após conectar
              o Mercado Pago.
            </div>
          )}

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {status?.connected ? (
            <Button variant="outline" onClick={handleDisconnect} disabled={acting}>
              <Unlink className="mr-1.5 h-4 w-4" />
              {acting ? 'Desconectando…' : 'Desconectar'}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={acting}>
              {acting ? (
                <>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Redirecionando…
                </>
              ) : (
                <>
                  <Link2 className="mr-1.5 h-4 w-4" />
                  Conectar Mercado Pago
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
