import type { DiscoverItem, PublicServiceDto, PublicTenantDto } from '@barbearia/schemas';

/**
 * Cliente server-side pra rotas públicas (`/public/tenants/:slug/...`).
 *
 * Usado nas páginas `/b/[slug]/*` da web pública (ADR-009). Sem auth —
 * a API pública é open (rate-limited). Cache HTTP é honrado via
 * `next.revalidate`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export class PublicApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PublicApiError';
  }
}

async function publicFetch<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new PublicApiError(res.status, `Public API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getPublicTenant(slug: string): Promise<PublicTenantDto> {
  return publicFetch<PublicTenantDto>(`/public/tenants/${encodeURIComponent(slug)}`);
}

export async function getPublicServices(slug: string): Promise<PublicServiceDto[]> {
  return publicFetch<PublicServiceDto[]>(
    `/public/tenants/${encodeURIComponent(slug)}/services`,
  );
}

export async function getDiscover(q?: string): Promise<DiscoverItem[]> {
  const search = q?.trim();
  const path = search ? `/public/discover?q=${encodeURIComponent(search)}` : '/public/discover';
  return publicFetch<DiscoverItem[]>(path, 60);
}

export function formatPriceBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDurationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
