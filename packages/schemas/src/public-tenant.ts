/**
 * DTOs públicos do tenant — consumidos pela web pública de booking
 * (`/b/[slug]`). Versão minimalista: o que é seguro expor sem auth.
 */

export interface PublicTenantDto {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

export interface PublicServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  basePriceCents: number;
}
