'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface Plan {
  name: string;
  desc: string;
  monthly: number;
  yearly: number; // por mês, cobrado anual
  popular?: boolean;
  feats: { label: string; off?: boolean }[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    desc: 'Pra quem tá começando e quer tirar a agenda do papel.',
    monthly: 0,
    yearly: 0,
    feats: [
      { label: '1 barbeiro' },
      { label: 'Agenda online + página pública' },
      { label: 'Pagamento no Pix' },
      { label: 'Lembretes automáticos', off: true },
      { label: 'Relatórios e repasse', off: true },
    ],
    cta: 'Começar grátis',
  },
  {
    name: 'Basic',
    desc: 'Pra barbearia montada que quer encher a cadeira.',
    monthly: 49,
    yearly: 39,
    popular: true,
    feats: [
      { label: 'Até 5 barbeiros' },
      { label: 'Tudo do Free' },
      { label: 'Lembretes que derrubam o no-show' },
      { label: 'Promoções e cupons' },
      { label: 'Relatórios e repasse', off: true },
    ],
    cta: 'Testar 14 dias grátis',
  },
  {
    name: 'Pro',
    desc: 'Pra quem toca várias cadeiras e quer tudo no controle.',
    monthly: 99,
    yearly: 79,
    feats: [
      { label: 'Barbeiros ilimitados' },
      { label: 'Tudo do Basic' },
      { label: 'Relatórios e repasse completos' },
      { label: 'Avaliações e reputação' },
      { label: 'Suporte prioritário' },
    ],
    cta: 'Testar 14 dias grátis',
  },
];

export function PricingSection() {
  const [cycle, setCycle] = useState<'mensal' | 'anual'>('mensal');

  return (
    <div>
      <div className="mb-12 text-center">
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
          Planos
        </span>
        <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide text-foreground">
          Comece de graça. Cresça quando quiser.
        </h2>
        <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-secondary p-1">
          <button
            onClick={() => setCycle('mensal')}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-bold transition-colors',
              cycle === 'mensal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setCycle('anual')}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-bold transition-colors',
              cycle === 'anual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Anual <span className="ml-1 text-[11px] font-extrabold text-emerald-700">−20%</span>
          </button>
        </div>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const price = cycle === 'mensal' ? p.monthly : p.yearly;
          return (
            <div
              key={p.name}
              className={cn(
                'relative flex flex-col rounded-[22px] border bg-card p-7',
                p.popular ? 'border-primary shadow-card' : 'border-border',
              )}
            >
              {p.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-destructive-foreground shadow">
                  Mais popular
                </span>
              ) : null}
              <h3 className="font-display text-3xl tracking-wide text-foreground">{p.name}</h3>
              <p className="mt-1 min-h-9 text-[13px] text-muted-foreground">{p.desc}</p>
              <div className="flex items-end gap-1">
                <span className="font-display text-[56px] leading-[0.9] text-foreground">
                  R${price}
                </span>
                <span className="mb-2 text-[13px] text-muted-foreground">/mês</span>
              </div>
              {cycle === 'anual' && p.yearly > 0 ? (
                <span className="mt-1 text-[11px] font-semibold text-emerald-700">
                  cobrado anualmente
                </span>
              ) : null}

              <ul className="my-6 flex flex-1 flex-col gap-3">
                {p.feats.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      'flex items-start gap-2.5 text-sm',
                      f.off ? 'text-muted-foreground/70' : 'text-foreground',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        f.off ? 'text-muted-foreground/40' : 'text-emerald-600',
                      )}
                    />
                    {f.label}
                  </li>
                ))}
              </ul>

              <Link
                href={`/onboarding?plan=${p.name.toLowerCase()}&cycle=${cycle}`}
                className={cn(
                  'inline-flex h-12 items-center justify-center rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5',
                  p.popular
                    ? 'bg-destructive text-destructive-foreground'
                    : 'border border-border bg-background text-foreground',
                )}
              >
                {p.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
