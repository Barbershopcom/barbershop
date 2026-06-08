-- Sprint 18 — opt-in do marketplace de descoberta (ADR-020 §1).
-- Idempotente. Default true: no piloto as barbearias aparecem sem config.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "listed_publicly" BOOLEAN NOT NULL DEFAULT true;

-- Índice parcial: a descoberta lista só os públicos, ordenando por nota.
CREATE INDEX IF NOT EXISTS "tenants_listed_publicly_idx"
  ON "tenants" ("listed_publicly")
  WHERE "listed_publicly" = true;
