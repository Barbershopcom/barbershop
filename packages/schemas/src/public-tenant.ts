/**
 * DTOs públicos do tenant — consumidos pela web pública de booking
 * (`/b/[slug]`). Versão minimalista: o que é seguro expor sem auth.
 */

/** Unidade pública (multi-unidade, spec 2026-07-07). */
export interface PublicUnitDto {
  slug: string;
  name: string;
  addressLine1: string;
  city: string;
}

export interface PublicTenantDto {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  /** Perfil público — opcional (ADR-012). */
  phoneE164: string | null;
  addressLine: string | null;
  instagramHandle: string | null;
  /** Rating médio 1..5 (null se sem avaliações) + total. ADR-019 §5. */
  ratingAvg: number | null;
  ratingCount: number;
  /** Unidade resolvida pelo slug — null quando o slug do tenant tem várias unidades. */
  unit: { slug: string; name: string } | null;
  /** Unidades ativas pro seletor (só no modo seletor; senão vazio). */
  units: PublicUnitDto[];
}

/** Barbeiro (resumido) que atende um serviço. */
export interface PublicServiceBarberDto {
  id: string;
  displayName: string;
}

export interface PublicServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  basePriceCents: number;
  /** Barbeiros ativos que fazem este serviço (capabilities). */
  barbers: PublicServiceBarberDto[];
}
