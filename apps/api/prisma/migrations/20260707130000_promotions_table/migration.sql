-- Promotions (ADR-020): tabela existia só via db push no dev — migration
-- faltava, e o DB de teste ficava sem ela. Idempotente (IF NOT EXISTS)
-- pra aplicar limpo onde a tabela já existe.

CREATE TABLE IF NOT EXISTS "promotions" (
    "id"             UUID NOT NULL,
    "tenant_id"      UUID NOT NULL,
    "name"           TEXT NOT NULL,
    "description"    TEXT,
    "discount_type"  TEXT NOT NULL DEFAULT 'percent',
    "discount_value" INTEGER NOT NULL,
    "valid_from"     TIMESTAMPTZ(6),
    "valid_until"    TIMESTAMPTZ(6),
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "promotions_tenant_id_idx" ON "promotions"("tenant_id");
CREATE INDEX IF NOT EXISTS "promotions_is_active_valid_from_valid_until_idx"
    ON "promotions"("is_active", "valid_from", "valid_until");

-- RLS: tenant isolation (mesmo padrão de coupons/appointments).
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "promotions_tenant_isolation" ON "promotions"
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
