'use client';

import type {
  BookedAppointment,
  PaymentMethod,
  PriceBreakdown,
} from '@barbearia/schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Props {
  slug: string;
  timezone: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  startAtIso: string;
  barberId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/**
 * Booking público em 2 steps (ADR-016):
 *   1) 'form'     → dados do cliente → POST cria appointment (awaiting_payment)
 *   2) 'checkout' → escolhe método de pagamento (mock) → POST /pay → /sucesso
 *
 * Idempotency-Key persiste o booking; o checkout reusa o mesmo appointmentId
 * (F5 no checkout não cria booking novo).
 */
export function BookingForm({
  slug,
  timezone,
  serviceId,
  serviceName,
  startAtIso,
  barberId,
}: Props) {
  const [step, setStep] = useState<'form' | 'checkout'>('form');
  const [booking, setBooking] = useState<BookedAppointment | null>(null);

  if (step === 'checkout' && booking) {
    return (
      <Checkout
        slug={slug}
        timezone={timezone}
        serviceName={serviceName}
        booking={booking}
        onBack={() => setStep('form')}
      />
    );
  }

  return (
    <CustomerForm
      slug={slug}
      timezone={timezone}
      serviceId={serviceId}
      startAtIso={startAtIso}
      barberId={barberId}
      onBooked={(b) => {
        setBooking(b);
        setStep('checkout');
      }}
    />
  );
}

// ── Step 1: dados do cliente ────────────────────────────────────────────

function CustomerForm({
  slug,
  timezone,
  serviceId,
  startAtIso,
  barberId,
  onBooked,
}: {
  slug: string;
  timezone: string;
  serviceId: string;
  startAtIso: string;
  barberId: string;
  onBooked: (b: BookedAppointment) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotLabel = formatSlot(startAtIso, timezone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setError('Telefone inválido. Ex: (11) 99999-9999.');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email inválido.');
      return;
    }

    const idemKey = getOrCreateIdempotencyKey(slug, serviceId, startAtIso);

    setBusy(true);
    try {
      const res = await fetch(
        `${API_URL}/public/tenants/${encodeURIComponent(slug)}/appointments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': idemKey,
            accept: 'application/json',
          },
          body: JSON.stringify({
            serviceId,
            barberId,
            startAt: startAtIso,
            customerName: trimmedName,
            customerPhone: e164,
            customerEmail: trimmedEmail || undefined,
          }),
        },
      );

      if (res.status === 409) {
        setError('Esse horário acabou de ser reservado. Escolha outro.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `Erro ${res.status} ao reservar.`);
        setBusy(false);
        return;
      }

      const booked = (await res.json()) as BookedAppointment;
      saveSuccessPayload({ booking: booked, serviceName: '', timezone });
      onBooked(booked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de rede. Tente de novo.');
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Horário escolhido
      </p>
      <p className="mt-1 text-base font-medium md:text-lg">{slotLabel}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="bf-name" className="block text-sm font-medium">
            Seu nome
          </label>
          <input
            id="bf-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Jajá Teste"
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bf-phone" className="block text-sm font-medium">
            Telefone (WhatsApp)
          </label>
          <input
            id="bf-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bf-email" className="block text-sm font-medium">
            Email <span className="text-xs text-muted-foreground">(opcional, recebe confirmação)</span>
          </label>
          <input
            id="bf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
            placeholder="voce@email.com"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-md bg-primary text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Reservando...' : 'Ir para pagamento'}
        </button>
      </form>
    </section>
  );
}

// ── Step 2: checkout / pagamento (mock) ─────────────────────────────────

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  wallet: 'Saldo da carteira',
};

const METHOD_ORDER: PaymentMethod[] = ['pix', 'credit', 'debit'];

interface PayResponse {
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

function Checkout({
  slug,
  timezone,
  serviceName,
  booking,
  onBack,
}: {
  slug: string;
  timezone: string;
  serviceName: string;
  booking: BookedAppointment;
  onBack: () => void;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<Record<PaymentMethod, PriceBreakdown> | null>(
    null,
  );
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // PIX real: nasce pending; mostramos o QR e fazemos polling até o webhook confirmar.
  const [pix, setPix] = useState<{ code: string | null; base64: string | null } | null>(null);
  const [pixStatus, setPixStatus] = useState('Aguardando pagamento…');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/public/appointments/${booking.id}/payment/options`, {
      headers: { accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { methods: Record<PaymentMethod, PriceBreakdown> }) => {
        if (!cancelled) setOptions(data.methods);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar as formas de pagamento.');
      });
    return () => {
      cancelled = true;
    };
  }, [booking.id]);

  async function handlePay() {
    setError(null);
    setBusy(true);
    try {
      // possessionToken (H3): prova de posse do agendamento gerada no booking
      // (BookedAppointment.cancelToken). Sem ele a API rejeita o /pay (400).
      const res = await fetch(
        `${API_URL}/public/appointments/${booking.id}/payment/pay`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ method, possessionToken: booking.cancelToken }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `Erro ${res.status} no pagamento.`);
        setBusy(false);
        return;
      }
      const payload = (await res.json()) as PayResponse;
      // PIX real volta o QR e fica pending — mostra o QR e poll-a o status.
      // Mock/aprovação imediata (sem QR) segue direto pro sucesso.
      if (method === 'pix' && (payload.pixQrCode || payload.pixQrCodeBase64)) {
        setPix({ code: payload.pixQrCode ?? null, base64: payload.pixQrCodeBase64 ?? null });
        setBusy(false);
        return;
      }
      saveSuccessPayload({ booking, serviceName, timezone });
      router.push(`/b/${encodeURIComponent(slug)}/sucesso?id=${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de rede no pagamento.');
      setBusy(false);
    }
  }

  // Polling do status enquanto o QR PIX está na tela (confirma via webhook).
  useEffect(() => {
    if (!pix) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`${API_URL}/public/appointments/${booking.id}/payment`, {
          headers: { accept: 'application/json' },
        });
        if (!r.ok || cancelled) return;
        const s = (await r.json()) as { status: string | null; appointmentStatus: string };
        if (cancelled) return;
        if (s.status === 'paid' || s.appointmentStatus !== 'awaiting_payment') {
          setPixStatus('Pagamento confirmado!');
          clearInterval(timer);
          saveSuccessPayload({ booking, serviceName, timezone });
          setTimeout(() => {
            if (!cancelled) router.push(`/b/${encodeURIComponent(slug)}/sucesso?id=${booking.id}`);
          }, 1200);
        } else if (s.status === 'failed' || s.status === 'expired') {
          setPixStatus('Pagamento não concluído. Tente novamente.');
          clearInterval(timer);
        }
      } catch {
        // rede instável — mantém o polling
      }
    };
    const timer = setInterval(poll, 3000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pix, booking, serviceName, timezone, slug, router]);

  function copyPix() {
    if (pix?.code) {
      void navigator.clipboard.writeText(pix.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (pix) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 md:p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagar com Pix</p>
        <p className="mt-1 text-base font-medium md:text-lg">
          {options ? formatBRL(options.pix.amountCents) : ''} · {serviceName}
        </p>

        <div className="mt-6 flex flex-col items-center">
          <div className="flex h-52 w-52 items-center justify-center rounded-lg bg-white p-4 shadow-sm">
            {pix.base64 ? (
              <img
                src={`data:image/png;base64,${pix.base64}`}
                alt="QR Code Pix"
                width={192}
                height={192}
              />
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                QR indisponível — use o copia e cola abaixo.
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Escaneie com o app do seu banco
          </p>
        </div>

        {pix.code ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Pix copia e cola</p>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs">{pix.code}</span>
              <button
                type="button"
                onClick={copyPix}
                className="shrink-0 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {pixStatus}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
      <p className="mt-1 text-base font-medium md:text-lg">
        {formatSlot(booking.startAt, timezone)}
      </p>

      <div className="mt-6 space-y-2">
        {METHOD_ORDER.map((m) => {
          const b = options?.[m];
          const isPix = m === 'pix';
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              disabled={busy}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                method === m
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/40'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{METHOD_LABELS[m]}</span>
                {isPix ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Recomendado · sem taxa
                  </span>
                ) : null}
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold">
                  {b ? formatBRL(b.amountCents) : '—'}
                </span>
                {b && b.feeCents > 0 ? (
                  <span className="block text-[11px] text-muted-foreground">
                    + {formatBRL(b.feeCents)} de taxa
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={busy || !options}
        className="mt-6 h-11 w-full rounded-md bg-primary text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy
          ? 'Processando...'
          : options
            ? `Pagar ${formatBRL(options[method].amountCents)}`
            : 'Carregando...'}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mt-3 w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Voltar
      </button>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Pagamento processado com segurança via Mercado Pago.
      </p>
    </section>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Aceita BR comum (`(11) 99999-9999`, `11 99999-9999`, `11999999999`)
 * e devolve E.164 (`+5511999999999`). Retorna null se inválido.
 */
function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.length === 12 || digits.length === 13) return `+${digits}`;
  return null;
}

function getOrCreateIdempotencyKey(
  slug: string,
  serviceId: string,
  startAt: string,
): string {
  const k = `booking-key:${slug}:${serviceId}:${startAt}`;
  const existing = sessionStorage.getItem(k);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(k, fresh);
  return fresh;
}

interface SuccessPayload {
  booking: BookedAppointment;
  serviceName: string;
  timezone: string;
}

function saveSuccessPayload(payload: SuccessPayload): void {
  sessionStorage.setItem(`booking-success:${payload.booking.id}`, JSON.stringify(payload));
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
