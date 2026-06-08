import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Scissors, Search, Star } from 'lucide-react';

import { formatPriceBRL, getDiscover } from '@/lib/public-api';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Descobrir barbearias — Barbearia',
  description: 'Encontre barbearias para agendar online. Veja avaliações e preços.',
  robots: { index: true, follow: true },
};

/**
 * Marketplace público de descoberta (ADR-020 §3). Server component com
 * busca via querystring `?q=` (form GET, sem JS no cliente). Cache 60s.
 */
export default async function DescobrirPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const items = await getDiscover(q);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Descubra barbearias
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Busque pelo nome, veja avaliações e agende online.
        </p>
      </header>

      <form action="/descobrir" method="get" className="mb-8">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar barbearia pelo nome"
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Buscar
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {q?.trim()
            ? `Nenhuma barbearia encontrada para "${q.trim()}".`
            : 'Nenhuma barbearia disponível ainda.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.slug}
              className="rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
            >
              <Link
                href={`/b/${it.slug}`}
                className="flex flex-col gap-2 p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-medium md:text-lg">{it.name}</h2>
                  {it.ratingCount > 0 && it.ratingAvg !== null ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{it.ratingAvg.toFixed(1)}</span>
                      <span className="text-muted-foreground">({it.ratingCount})</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Sem avaliações
                    </span>
                  )}
                </div>

                {it.addressLine ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{it.addressLine}</span>
                  </span>
                ) : null}

                {it.priceFromCents !== null ? (
                  <span className="text-xs text-muted-foreground">
                    A partir de{' '}
                    <span className="font-semibold text-foreground">
                      {formatPriceBRL(it.priceFromCents)}
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Scissors className="h-3.5 w-3.5" />
        Powered by Barbearia
      </footer>
    </main>
  );
}
