import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import {
  formatDurationLabel,
  formatPriceBRL,
  getPublicServices,
  getPublicTenant,
  PublicApiError,
} from '@/lib/public-api';

import { BookingForm } from './_booking-form';
import { BookingPicker } from './_booking-picker';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string; b?: string; t?: string }>;
}

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Agendar horário',
  robots: { index: false, follow: false },
};

/**
 * `/b/[slug]/agendar?s=<serviceId>&b=<barberId?>` — fluxo de agendamento.
 *
 * - Valida serviço server-side (404 se inexistente/inativo).
 * - Renderiza header com nome da barbearia + serviço escolhido.
 * - Delega calendar + slot picker pro client component (Fase 3+).
 */
export default async function AgendarPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { s: serviceId, b: barberId, t } = await searchParams;

  if (!serviceId) {
    redirect(`/b/${encodeURIComponent(slug)}`);
  }

  try {
    const [tenant, services] = await Promise.all([
      getPublicTenant(slug),
      getPublicServices(slug),
    ]);

    const service = services.find((it) => it.id === serviceId);
    if (!service) notFound();

    return (
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
        <Link
          href={`/b/${tenant.slug}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Trocar serviço
        </Link>

        <header className="mb-6 md:mb-8">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {tenant.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {service.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDurationLabel(service.durationMin)}</span>
            <span aria-hidden>·</span>
            <span className="font-medium text-primary">
              {formatPriceBRL(service.basePriceCents)}
            </span>
          </div>
          {service.description ? (
            <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>
          ) : null}
        </header>

        {t && barberId ? (
          <>
            <BookingForm
              slug={tenant.slug}
              timezone={tenant.timezone}
              serviceId={service.id}
              serviceName={service.name}
              serviceDurationMin={service.durationMin}
              startAtIso={t}
              barberId={barberId}
            />
            <Link
              href={`/b/${tenant.slug}/agendar?s=${service.id}`}
              className="mt-4 inline-block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ← Trocar horário
            </Link>
          </>
        ) : (
          <BookingPicker
            slug={tenant.slug}
            timezone={tenant.timezone}
            serviceId={service.id}
            serviceDurationMin={service.durationMin}
            initialBarberId={barberId}
          />
        )}
      </main>
    );
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}

