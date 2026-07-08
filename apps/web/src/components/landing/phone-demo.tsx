'use client';

import { ArrowLeft, Check, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Demo navegável do app do cliente no hero da landing (spec 2026-07-08).
 * 100% mocado — nenhuma chamada de rede. O visitante toca de verdade:
 * serviço → barbeiro → horário → Pix (confirma sozinho) → sucesso.
 */

type Step = 'home' | 'barber' | 'time' | 'pix' | 'done';

const STEPS: Step[] = ['home', 'barber', 'time', 'pix', 'done'];

const SERVICES = [
  { id: 's1', name: 'Corte degradê', min: 40, price: 'R$ 45' },
  { id: 's2', name: 'Corte + barba', min: 60, price: 'R$ 70' },
  { id: 's3', name: 'Barba completa', min: 30, price: 'R$ 35' },
] as const;

const BARBERS = [
  { id: 'b1', name: 'Renan', rating: '4,9', color: '#bf212f' },
  { id: 'b2', name: 'Du', rating: '4,8', color: '#1a365d' },
  { id: 'b3', name: 'Jajá', rating: '5,0', color: '#c5a059' },
] as const;

const TIMES = [
  { t: '09:00', busy: true },
  { t: '10:30', busy: false },
  { t: '11:30', busy: true },
  { t: '14:30', busy: false },
  { t: '16:00', busy: false },
  { t: '17:30', busy: true },
] as const;

/** QR fake: grade determinística que lembra um QR sem ser um. */
function FakeQr() {
  const cells: boolean[] = [];
  for (let i = 0; i < 121; i++) {
    // padrão fixo pseudo-aleatório (nada de Math.random — SSR-safe)
    cells.push(((i * 7919) % 13) < 6);
  }
  return (
    <div className="mx-auto grid h-28 w-28 grid-cols-11 gap-px rounded-md border-4 border-tinta bg-white p-1">
      {cells.map((on, i) => (
        <div key={i} className={on ? 'bg-tinta' : 'bg-white'} />
      ))}
    </div>
  );
}

export function PhoneDemo() {
  const [step, setStep] = useState<Step>('home');
  const [service, setService] = useState<(typeof SERVICES)[number] | null>(null);
  const [barber, setBarber] = useState<(typeof BARBERS)[number] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  // Pix confirma sozinho (o pitch do "confirmação instantânea").
  useEffect(() => {
    if (step !== 'pix') return;
    const t1 = setTimeout(() => setPaid(true), 1500);
    const t2 = setTimeout(() => setStep('done'), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  function reset() {
    setStep('home');
    setService(null);
    setBarber(null);
    setTime(null);
    setPaid(false);
  }

  function back() {
    if (step === 'barber') setStep('home');
    if (step === 'time') setStep('barber');
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="h-[380px] w-48 -rotate-3 rounded-[30px] bg-tinta p-2 shadow-lg">
      <div className="flex h-full w-full flex-col rounded-[24px] bg-papel p-3">
        {/* topo: marca + progresso */}
        <div className="flex items-center justify-between">
          <span className="font-display text-lg tracking-wide text-navy">NAVALHA</span>
          {step !== 'home' && step !== 'done' && step !== 'pix' ? (
            <button
              onClick={back}
              aria-label="Voltar"
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="mt-1.5 flex gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= stepIdx ? 'bg-destructive' : 'bg-secondary',
              )}
            />
          ))}
        </div>

        {/* telas */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          {step === 'home' ? (
            <>
              <p className="text-[11px] font-bold text-foreground">Barbearia do Jajá</p>
              <p className="text-[9px] text-muted-foreground">Escolha um serviço 👇</p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {SERVICES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setService(s);
                      setStep('barber');
                    }}
                    className={cn(
                      'rounded-lg border border-border bg-white px-2 py-1.5 text-left transition-colors hover:border-destructive',
                      i === 0 && 'animate-pulse ring-1 ring-destructive/60',
                    )}
                  >
                    <span className="block text-[10px] font-bold text-foreground">{s.name}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {s.min} min · <b className="text-destructive">{s.price}</b>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'barber' ? (
            <>
              <p className="text-[11px] font-bold text-foreground">{service?.name}</p>
              <p className="text-[9px] text-muted-foreground">Com quem vai ser?</p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {BARBERS.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBarber(b);
                      setStep('time');
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 text-left transition-colors hover:border-destructive',
                      i === 0 && 'animate-pulse ring-1 ring-destructive/60',
                    )}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[11px] text-white"
                      style={{ backgroundColor: b.color }}
                    >
                      {b.name[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold text-foreground">{b.name}</span>
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                        <Star className="h-2.5 w-2.5 fill-dourado text-dourado" /> {b.rating}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'time' ? (
            <>
              <p className="text-[11px] font-bold text-foreground">Sábado, 11 de julho</p>
              <p className="text-[9px] text-muted-foreground">Horários com {barber?.name}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {TIMES.map((slot, i) => (
                  <button
                    key={slot.t}
                    disabled={slot.busy}
                    onClick={() => {
                      setTime(slot.t);
                      setStep('pix');
                    }}
                    className={cn(
                      'rounded-lg border px-1 py-1.5 text-[10px] font-bold transition-colors',
                      slot.busy
                        ? 'cursor-not-allowed border-border bg-secondary text-muted-foreground/50 line-through'
                        : 'border-border bg-white text-foreground hover:border-destructive',
                      i === 1 && 'animate-pulse ring-1 ring-destructive/60',
                    )}
                  >
                    {slot.t}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'pix' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-[11px] font-bold text-foreground">
                Pague {service?.price} no Pix
              </p>
              <FakeQr />
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[9px] font-bold transition-all',
                  paid
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'animate-pulse bg-secondary text-muted-foreground',
                )}
              >
                {paid ? '✓ Pagamento confirmado na hora' : 'Aguardando Pix…'}
              </span>
            </div>
          ) : null}

          {step === 'done' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" strokeWidth={3} />
              </span>
              <p className="text-[12px] font-bold text-foreground">Corte marcado!</p>
              <p className="text-[10px] text-muted-foreground">
                Sábado · {time} · {barber?.name}
                <br />
                {service?.name} · {service?.price}
              </p>
              <p className="text-[9px] text-muted-foreground">
                Lembrete automático antes do horário 🔔
              </p>
              <button
                onClick={reset}
                className="mt-1 rounded-lg bg-destructive px-3 py-1.5 text-[10px] font-bold text-destructive-foreground"
              >
                Refazer demo
              </button>
            </div>
          ) : null}
        </div>

        {step === 'home' ? (
          <p className="pt-1 text-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
            👆 Demo interativa — toque e teste
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Teaser estático da agenda do barbeiro (telefone menor, atrás). */
export function BarberPhoneTeaser() {
  return (
    <div className="h-[340px] w-44 rotate-3 rounded-[28px] bg-tinta p-2 opacity-95 shadow-lg">
      <div className="flex h-full w-full flex-col gap-1.5 rounded-[22px] bg-secondary p-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-navy">
          Agenda de hoje
        </p>
        {[
          { t: '09:00', n: 'João', ok: true },
          { t: '10:30', n: 'Pedro', ok: true },
          { t: '14:30', n: 'Lucas', ok: false },
        ].map((a) => (
          <div key={a.t} className="rounded-lg bg-white/80 px-2 py-1.5">
            <span className="block text-[10px] font-bold text-foreground">
              {a.t} · {a.n}
            </span>
            <span
              className={cn(
                'text-[8.5px] font-semibold',
                a.ok ? 'text-emerald-600' : 'text-amber-600',
              )}
            >
              {a.ok ? '✓ Confirmado' : '● Aguardando'}
            </span>
          </div>
        ))}
        <div className="mt-auto rounded-lg bg-navy px-2 py-1.5 text-center text-[9px] font-bold text-white">
          R$ 380 hoje
        </div>
      </div>
    </div>
  );
}

/** Bloco completo do hero: os dois telefones (usado pelo page.tsx). */
export function HeroPhones() {
  return (
    <div className="relative flex items-end gap-4">
      <BarberPhoneTeaser />
      <PhoneDemo />
    </div>
  );
}
