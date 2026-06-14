-- Sprint 21 — MP Connect: conta Mercado Pago do vendedor pro split (ADR-022 §2).
-- Idempotente. Tokens são segredos (nunca logados/expostos em API pública).
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_user_id"           TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_access_token"      TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_refresh_token"     TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_token_expires_at"  TIMESTAMPTZ(6);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_connected_at"      TIMESTAMPTZ(6);
