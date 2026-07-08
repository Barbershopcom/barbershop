'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Demo mocada da seção "Dois apps" (spec 2026-07-08): abas Barbeiro e
 * Painel do dono. O fluxo do cliente já é jogável no hero — aqui o pitch é
 * "o barbeiro confirma na hora" e "o dono vê tudo".
 */

type Tab = 'barber' | 'owner';

interface AgendaItem {
  id: number;
  t: string;
  n: string | null;
  svc: string | null;
  status: 'ok' | 'pending' | 'free';
}

const AGENDA_INICIAL: AgendaItem[] = [
  { id: 1, t: '09:00', n: 'João', svc: 'Corte degradê', status: 'ok' },
  { id: 2, t: '10:30', n: 'Pedro', svc: 'Corte + barba', status: 'ok' },
  { id: 3, t: '14:30', n: 'Lucas', svc: 'Corte degradê', status: 'pending' },
  { id: 4, t: '16:00', n: null, svc: null, status: 'free' },
];

const RANKING = [
  { name: 'Renan', total: 'R$ 1.240', pct: 100 },
  { name: 'Du', total: 'R$ 980', pct: 79 },
  { name: 'Jajá', total: 'R$ 760', pct: 61 },
];

export function AppDemoPanel() {
  const [tab, setTab] = useState<Tab>('barber');
  const [agenda, setAgenda] = useState(AGENDA_INICIAL);
  const justConfirmed = agenda.every((a) => a.status !== 'pending');

  function confirm(id: number) {
    setAgenda((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'ok' } : a)));
  }

  return (
    <div className="rounded-[14px] border border-papel/15 bg-papel/5 p-5 shadow-lg">
      {/* abas */}
      <div className="mb-4 inline-flex rounded-full bg-papel/10 p-1">
        {(
          [
            ['barber', 'App do barbeiro'],
            ['owner', 'Painel do dono'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
              tab === key ? 'bg-dourado text-tinta' : 'text-papel/70 hover:text-papel',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'barber' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-papel/60">
              Agenda de hoje · Renan
            </p>
            <span className="text-[11px] text-papel/50">
              {justConfirmed ? 'tudo confirmado ✓' : 'toque no pendente 👇'}
            </span>
          </div>
          {agenda.map((a) =>
            a.status === 'free' ? (
              <div
                key={a.id}
                className="rounded-lg border border-dashed border-papel/20 px-3 py-2.5 text-[13px] text-papel/40"
              >
                {a.t} · Livre — divulgue seu link e encha esse horário
              </div>
            ) : (
              <button
                key={a.id}
                disabled={a.status === 'ok'}
                onClick={() => confirm(a.id)}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all',
                  a.status === 'ok'
                    ? 'bg-papel/10'
                    : 'animate-pulse bg-dourado/20 ring-1 ring-dourado/60 hover:bg-dourado/30',
                )}
              >
                <span>
                  <span className="block text-[13px] font-bold text-papel">
                    {a.t} · {a.n}
                  </span>
                  <span className="text-[11px] text-papel/60">{a.svc}</span>
                </span>
                {a.status === 'ok' ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    <Check className="h-3 w-3" strokeWidth={3} /> Confirmado
                  </span>
                ) : (
                  <span className="rounded-full bg-dourado/25 px-2 py-0.5 text-[11px] font-bold text-dourado">
                    Confirmar agora
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-papel/10 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-papel/50">
                Faturamento hoje
              </span>
              <b className="block font-display text-3xl leading-tight text-dourado">R$ 380</b>
            </div>
            <div className="rounded-lg bg-papel/10 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-papel/50">
                Cortes na semana
              </span>
              <b className="block font-display text-3xl leading-tight text-papel">42</b>
            </div>
          </div>
          <div className="rounded-lg bg-papel/10 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-papel/50">
              Ranking do mês
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {RANKING.map((r) => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="w-12 text-[12px] font-bold text-papel">{r.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-papel/10">
                    <span
                      className="block h-full rounded-full bg-dourado"
                      style={{ width: `${r.pct}%` }}
                    />
                  </span>
                  <span className="w-16 text-right text-[11px] text-papel/70">{r.total}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-[11px] text-papel/50">
            Comissão e repasse calculados sozinhos — sem caderninho.
          </p>
        </div>
      )}
    </div>
  );
}
