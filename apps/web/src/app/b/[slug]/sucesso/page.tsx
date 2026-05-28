import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublicTenant, PublicApiError } from '@/lib/public-api';

import { SuccessCard } from './_success-card';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}

export const metadata: Metadata = {
  title: 'Agendamento confirmado',
  robots: { index: false, follow: false },
};

/**
 * Tela de confirmação pós-booking. Dados frescos vêm de sessionStorage
 * (gravados pelo BookingForm). Se ausente (link compartilhado ou cache
 * limpo), mostra fallback genérico — usuário deve consultar email.
 */
export default async function SucessoPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { id } = await searchParams;

  try {
    const tenant = await getPublicTenant(slug);
    return (
      <main className="mx-auto max-w-md px-4 py-10 md:px-6 md:py-16">
        <SuccessCard
          tenantName={tenant.name}
          tenantSlug={tenant.slug}
          bookingId={id ?? null}
        />
      </main>
    );
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) notFound();
    throw err;
  }
}
