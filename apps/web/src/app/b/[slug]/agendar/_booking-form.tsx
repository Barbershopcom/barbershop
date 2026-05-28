'use client';

import type { BookedAppointment } from '@barbearia/schemas';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
 * Step 2 do booking público: nome, telefone, email (opcional) e submit.
 *
 * - Telefone normalizado de "(11) 99999-9999" pra "+5511999999999".
 * - Idempotency-Key persiste em sessionStorage por (slug, serviceId,
 *   startAt) — F5 não cria dois bookings.
 * - 409 (slot levado) volta o usuário pro picker.
 * - 422 mostra mensagem inline.
 * - Sucesso: response vai pra sessionStorage e router.push pra /sucesso.
 */
export function BookingForm({
  slug,
  timezone,
  serviceId,
  serviceName,
  startAtIso,
  barberId,
}: Props) {
  const router = useRouter();
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
        setError(body?.message ?? `Erro ${res.status} ao confirmar reserva.`);
        setBusy(false);
        return;
      }

      const booked = (await res.json()) as BookedAppointment;
      saveSuccessPayload({
        booking: booked,
        serviceName,
        timezone,
      });
      router.push(`/b/${encodeURIComponent(slug)}/sucesso?id=${booked.id}`);
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
            placeholder="João da Silva"
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
          {busy ? 'Confirmando...' : 'Confirmar agendamento'}
        </button>
      </form>
    </section>
  );
}

/**
 * Aceita BR comum (`(11) 99999-9999`, `11 99999-9999`, `11999999999`)
 * e devolve E.164 (`+5511999999999`). Retorna null se inválido.
 *
 * Regra: 10 ou 11 dígitos → assume Brasil (+55). Se já vem com `+`,
 * mantém como veio (cliente sabe o que digitou).
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
