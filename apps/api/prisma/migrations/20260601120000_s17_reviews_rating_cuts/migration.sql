-- Sprint 17 — Avaliações + rating agregado + contador de cortes (ADR-019).
-- Idempotente: IF NOT EXISTS / DO blocks pra ser re-aplicável com segurança.

-- ============================================================
-- Agregados de rating (cache; fonte = tabela reviews)
-- ============================================================
ALTER TABLE "employees"   ADD COLUMN IF NOT EXISTS "rating_avg"   DOUBLE PRECISION;
ALTER TABLE "employees"   ADD COLUMN IF NOT EXISTS "rating_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "barbershops" ADD COLUMN IF NOT EXISTS "rating_avg"   DOUBLE PRECISION;
ALTER TABLE "barbershops" ADD COLUMN IF NOT EXISTS "rating_count" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Contador de cortes do cliente (cache; fonte = appointments completed)
-- ============================================================
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "completed_cuts_count" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Tabela reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS "reviews" (
    "id"             UUID NOT NULL,
    "tenant_id"      UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "customer_id"    UUID NOT NULL,
    "barber_id"      UUID NOT NULL,
    "barbershop_id"  UUID NOT NULL,
    "rating"         INTEGER NOT NULL,
    "comment"        TEXT,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- rating válido 1..5 (defesa no banco além do Zod)
DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check"
        CHECK ("rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_appointment_id_key" ON "reviews"("appointment_id");
CREATE INDEX IF NOT EXISTS "reviews_tenant_id_idx"     ON "reviews"("tenant_id");
CREATE INDEX IF NOT EXISTS "reviews_barber_id_idx"     ON "reviews"("barber_id");
CREATE INDEX IF NOT EXISTS "reviews_barbershop_id_idx" ON "reviews"("barbershop_id");
CREATE INDEX IF NOT EXISTS "reviews_customer_id_idx"   ON "reviews"("customer_id");

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey"
        FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey"
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barber_id_fkey"
        FOREIGN KEY ("barber_id") REFERENCES "employees"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barbershop_id_fkey"
        FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- RLS: tenant isolation (igual appointments/payments). ADR-019 §4.
-- Cliente escreve via role bypassRLS (PrismaService); barbeiro lê via @Tx.
-- ============================================================
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "reviews_tenant_isolation" ON "reviews"
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
