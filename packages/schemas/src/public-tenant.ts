/**
 * DTOs públicos do tenant — consumidos pela web pública de booking
 * (`/b/[slug]`). Versão minimalista: o que é seguro expor sem auth.
 */

export interface PublicTenantDto {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  /** Perfil público — opcional (ADR-012). */
  phoneE164: string | null;
  addressLine: string | null;
  instagramHandle: string | null;
}

export interface PublicServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  basePriceCents: number;
}
