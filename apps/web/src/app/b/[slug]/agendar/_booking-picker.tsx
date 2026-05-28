'use client';

import type { Slot, SlotsResponse } from '@barbearia/schemas';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';

import 'react-day-picker/style.css';

interface Props {
  slug: string;
  timezone: string;
  serviceId: string;
  serviceDurationMin: number;
  initialBarberId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/**
 * Step 1 do booking público: cliente escolhe dia + horário.
 *
 * - DayPicker (react-day-picker) com locale pt-BR, weekStartsOn=domingo
 * - Disabled: dias no passado (no fuso do tenant)
 * - Ao mudar data: fetch /public/tenants/:slug/slots pro dia
 * - Slots renderizados como chips, agrupados visualmente por barbeiro
 * - Filtro opcional de barbeiro (pills) acima da grid de slots
 * - Click no slot → navega pra ?s=ID&t=ISO&b=barberId (Fase 3)
 */
export function BookingPicker({
  slug,
  timezone,
  serviceId,
  initialBarberId,
}: Props) {
  const router = useRouter();
  const today = useMemo(() => todayInTz(timezone), [timezone]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barberFilter, setBarberFilter] = useState<string | undefined>(initialBarberId);

  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = formatYMD(selectedDate);
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      serviceId,
      from: dateStr,
      to: dateStr,
    });
    if (barberFilter) params.set('barberId', barberFilter);

    fetch(`${API_URL}/public/tenants/${encodeURIComponent(slug)}/slots?${params}`, {
      headers: { accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Erro ${res.status} ao buscar horários`);
        }
        return (await res.json()) as SlotsResponse;
      })
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao buscar horários');
          setSlots([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, serviceId, selectedDate, barberFilter]);

  const barbersInResults = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of slots) m.set(s.barberId, s.barberName);
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [slots]);

  function selectSlot(slot: Slot) {
    const params = new URLSearchParams({
      s: serviceId,
      t: slot.startAt,
      b: slot.barberId,
    });
    router.push(`/b/${encodeURIComponent(slug)}/agendar?${params.toString()}`);
  }

  return (
    <section className="grid gap-6 md:grid-cols-[auto_1fr] md:gap-8">
      <div className="flex justify-center md:block">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={{ before: today }}
          locale={ptBR}
          weekStartsOn={0}
          className="rdp-public"
        />
      </div>

      <div className="min-w-0">
        {barbersInResults.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterPill
              active={!barberFilter}
              onClick={() => setBarberFilter(undefined)}
              label="Todos"
            />
            {barbersInResults.map((b) => (
              <FilterPill
                key={b.id}
                active={barberFilter === b.id}
                onClick={() => setBarberFilter(b.id)}
                label={b.name}
              />
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Buscando horários...
          </p>
        ) : error ? (
          <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum horário disponível neste dia. Tente outra data.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={`${slot.startAt}-${slot.barberId}`}
                type="button"
                onClick={() => selectSlot(slot)}
                className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-background px-2 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span>{formatTimeInTz(slot.startAt, timezone)}</span>
                {barbersInResults.length > 1 ? (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {slot.barberName}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
          : 'rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }
    >
      {label}
    </button>
  );
}

function todayInTz(timezone: string): Date {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const ymd = fmt.format(new Date());
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
