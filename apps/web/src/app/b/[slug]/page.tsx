import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Instagram, MapPin, MessageCircle, Star } from 'lucide-react';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tenant = await getPublicTenant(slug);
    const title = `${tenant.name} — Agende online`;
    const description = `Agendamento online para ${tenant.name}. Escolha um horário em segundos.`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary', title, description },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Barbearia não encontrada', robots: { index: false } };
  }
}

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

    const hasContact =
      tenant.phoneE164 || tenant.addressLine || tenant.instagramHandle;

    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <header className="mb-8 text-center md:mb-10">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {tenant.name}
          </h1>
          {tenant.ratingCount > 0 && tenant.ratingAvg !== null ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-sm">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${
                      n <= Math.round(tenant.ratingAvg ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                ))}
              </span>
              <span className="font-medium text-foreground">
                {tenant.ratingAvg.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({tenant.ratingCount}{' '}
                {tenant.ratingCount === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha um serviço para começar seu agendamento.
          </p>
        </header>

        {hasContact ? (
          <section className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm md:flex-row md:justify-center md:gap-6">
            {tenant.addressLine ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tenant.addressLine}</span>
              </div>
            ) : null}
            {tenant.instagramHandle ? (
              <a
                href={`https://instagram.com/${tenant.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
                <span>@{tenant.instagramHandle}</span>
              </a>
            ) : null}
            {tenant.phoneE164 ? (
              <a
                href={buildWhatsAppLink(tenant.phoneE164, tenant.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chamar no WhatsApp</span>
              </a>
            ) : null}
          </section>
        ) : null}

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

function buildWhatsAppLink(phoneE164: string, tenantName: string): string {
  // wa.me não aceita o '+' inicial nem espaços (ADR-012 §2).
  const digits = phoneE164.replace(/^\+/, '');
  const text = encodeURIComponent(
    `Olá, ${tenantName}! Vim pelo site e gostaria de agendar.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}
