import { notFound } from 'next/navigation';
import Link from 'next/link';

import {
  formatDurationLabel,
  formatPriceBRL,
  getPublicServices,
  getPublicTenant,
  PublicApiError,
} from '@/lib/public-api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30;

/**
 * Landing pública da barbearia (`/b/[slug]`). ADR-009 Fase 1.
 *
 * - Server component: faz fetch direto da API pública com cache 30s.
 * - 404 nativo do Next se o slug não existir.
 * - Lista de serviços com botão "Agendar" que leva pro fluxo Fase 3+.
 */
export default async function PublicTenantLanding({ params }: PageProps) {
  const { slug } = await params;

  try {
    const [tenant, services] = await Promise.all([
      getPublicTenant(slug),
      getPublicServices(slug),
    ]);

    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <header className="mb-10 text-center md:mb-14">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {tenant.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha um serviço para começar seu agendamento.
          </p>
        </header>

        {services.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Esta barbearia ainda não disponibilizou serviços para agendamento.
          </div>
        ) : (
          <ul className="space-y-3">
            {services.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 md:p-5"
              >
                <Link
                  href={`/b/${tenant.slug}/agendar?s=${s.id}`}
                  className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium md:text-lg">{s.name}</h2>
                    {s.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDurationLabel(s.durationMin)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-center md:gap-1">
                    <span className="text-lg font-semibold text-primary md:text-xl">
                      {formatPriceBRL(s.basePriceCents)}
                    </span>
                    <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                      Agendar
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Powered by Barbearia
        </footer>
      </main>
    );
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
