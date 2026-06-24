-- Billing: tabela subscriptions com RLS tenant-scoped (ADR-billing). Idempotente.

-- ============================================================
-- subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"           UUID NOT NULL,
    "billing_cycle"       TEXT NOT NULL,
    "status"              TEXT NOT NULL DEFAULT 'trialing',
    "price_cents"         INTEGER NOT NULL,
    "mp_preapproval_id"   TEXT,
    "trial_ends_at"       TIMESTAMPTZ(6) NOT NULL,
    "current_period_end"  TIMESTAMPTZ(6),
    "last_payment_status" TEXT,
    "last_charged_at"     TIMESTAMPTZ(6),
    "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_mp_preapproval_id_idx" ON "subscriptions"("mp_preapproval_id");

DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- RLS: tenant isolation (mesmo padrão de coupons/payments/reviews). ADR-billing.
-- ============================================================
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "subscriptions_tenant_isolation" ON "subscriptions"
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
