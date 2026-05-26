'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

interface CancelPreview {
  id: string;
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  startAtIso: string;
  endAtIso: string;
  customerName: string;
  tenantName: string;
  serviceName: string;
  barberName: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; appt: CancelPreview }
  | { kind: 'already-cancelled'; appt: CancelPreview }
  | { kind: 'cancelling' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/**
 * Magic-link cancel page. Two-step: GET preview → POST execute.
 * Ver ADR-006 §9 (proteção contra preview-bots de email).
 */
export default function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    void params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void loadPreview(token).then(setView);
  }, [token]);

  async function handleCancel() {
    if (!token) return;
    setView({ kind: 'cancelling' });
    try {
      const res = await fetch(`${API_URL}/public/appointments/cancel/${token}`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Falha (${res.status})`);
      }
      setView({ kind: 'cancelled' });
    } catch (err) {
      setView({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao cancelar.',
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        {renderCard(view, handleCancel)}
      </Card>
    </div>
  );
}

function renderCard(view: ViewState, onCancel: () => void) {
  if (view.kind === 'loading') {
    return (
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Carregando...
      </CardContent>
    );
  }

  if (view.kind === 'error') {
    return (
      <>
        <CardHeader>
          <CardTitle>Não foi possível abrir esse link</CardTitle>
          <CardDescription>{view.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Se você acha que isso é um erro, entre em contato com a barbearia.
        </CardContent>
      </>
    );
  }

  if (view.kind === 'cancelled') {
    return (
      <>
        <CardHeader>
          <CardTitle>Agendamento cancelado</CardTitle>
          <CardDescription>
            Pronto! Você receberá um email confirmando o cancelamento.
          </CardDescription>
        </CardHeader>
      </>
    );
  }

  if (view.kind === 'already-cancelled') {
    return (
      <>
        <CardHeader>
          <CardTitle>Já está cancelado</CardTitle>
          <CardDescription>
            Esse agendamento já foi cancelado anteriormente.
          </CardDescription>
        </CardHeader>
      </>
    );
  }

  if (view.kind === 'cancelling') {
    return (
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Cancelando...
      </CardContent>
    );
  }

  const { appt } = view;
  return (
    <>
      <CardHeader>
        <CardTitle>Cancelar agendamento?</CardTitle>
        <CardDescription>
          {appt.tenantName} — {appt.dateLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="font-semibold">
            {appt.timeLabel}{' '}
            <span className="font-normal text-muted-foreground">
              ({appt.durationLabel})
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {appt.serviceName} com {appt.barberName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente: {appt.customerName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={onCancel}>
            Sim, cancelar
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => window.close()}>
            Não, manter
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Se cancelar agora, o horário fica disponível pra outras pessoas.
        </p>
      </CardContent>
    </>
  );
}

async function loadPreview(token: string): Promise<ViewState> {
  try {
    const res = await fetch(`${API_URL}/public/appointments/cancel/${token}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        kind: 'error',
        message: body.message ?? `Não foi possível carregar (${res.status})`,
      };
    }
    const appt = (await res.json()) as CancelPreview;
    if (appt.status === 'cancelled') {
      return { kind: 'already-cancelled', appt };
    }
    if (appt.status !== 'booked') {
      return {
        kind: 'error',
        message: `Esse agendamento está '${appt.status}' e não pode ser cancelado pelo cliente.`,
      };
    }
    return { kind: 'ready', appt };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Erro de rede.',
    };
  }
}
