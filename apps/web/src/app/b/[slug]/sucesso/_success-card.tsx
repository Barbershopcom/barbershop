'use client';

import type { BookedAppointment } from '@barbearia/schemas';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  tenantName: string;
  tenantSlug: string;
  bookingId: string | null;
}

interface SuccessPayload {
  booking: BookedAppointment;
  serviceName: string;
  timezone: string;
}

/**
 * Carrega o payload de sucesso de sessionStorage. Se ausente (link
 * compartilhado, refresh em outra aba), mostra fallback genérico
 * pedindo pro cliente checar email.
 */
export function SuccessCard({ tenantName, tenantSlug, bookingId }: Props) {
  const [payload, setPayload] = useState<SuccessPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoaded(true);
      return;
    }
    const raw = sessionStorage.getItem(`booking-success:${bookingId}`);
    if (raw) {
      try {
        setPayload(JSON.parse(raw) as SuccessPayload);
      } catch {
        // payload corrompido — ignora, fallback assume
      }
    }
    setLoaded(true);
  }, [bookingId]);

  if (!loaded) {
    return (
      <p className="text-center text-sm text-muted-foreground">Carregando...</p>
    );
  }

  // Após o pagamento mock o booking fica 'pending' (aguardando barbeiro).
  const isPending = payload?.booking.status === 'pending';

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
      <h1 className="mt-4 text-2xl font-semibold">
        {isPending ? 'Pagamento recebido!' : 'Agendamento confirmado!'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{tenantName}</p>

      {isPending ? (
        <p className="mx-auto mt-4 max-w-sm rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aguardando o barbeiro confirmar — você recebe um aviso assim que ele
          aceitar (normalmente em até 1h).
        </p>
      ) : null}

      {payload ? (
        <dl className="mt-6 space-y-3 rounded-lg border border-border bg-card p-5 text-left text-sm">
          {payload.serviceName ? <Row label="Serviço" value={payload.serviceName} /> : null}
          <Row
            label="Data e hora"
            value={formatSlot(payload.booking.startAt, payload.timezone)}
          />
          <Row label="Cliente" value={payload.booking.customerName} />
          <Row label="Valor" value={formatBRL(payload.booking.priceCents)} />
          {payload.booking.customerEmail ? (
            <Row label="Email" value={payload.booking.customerEmail} />
          ) : null}
        </dl>
      ) : (
        <p className="mt-6 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Verifique seu email — o link de confirmação e cancelamento foi enviado
          pra lá.
        </p>
      )}

      {payload?.booking.customerEmail ? (
        <p className="mt-5 text-xs text-muted-foreground">
          Enviamos a confirmação pra <strong>{payload.booking.customerEmail}</strong>.
          O link de cancelamento também está no email.
        </p>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">
          Sem email cadastrado. Anote os dados ou tire um print desta tela.
        </p>
      )}

      <Link
        href={`/b/${tenantSlug}`}
        className="mt-8 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar à página da barbearia
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function formatSlot(iso: string, tz: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
