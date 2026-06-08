-- Sprint 19 — cupons de desconto (ADR-021). Idempotente.

-- ============================================================
-- coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS "coupons" (
    "id"              UUID NOT NULL,
    "tenant_id"       UUID NOT NULL,
    "code"            TEXT NOT NULL,
    "description"     TEXT,
    "discount_type"   TEXT NOT NULL,
    "discount_value"  INTEGER NOT NULL,
    "min_order_cents" INTEGER,
    "valid_from"      TIMESTAMPTZ(6),
    "valid_until"     TIMESTAMPTZ(6),
    "max_redemptions" INTEGER,
    "times_redeemed"  INTEGER NOT NULL DEFAULT 0,
    "is_active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "coupons" ADD CONSTRAINT "coupons_discount_type_check"
        CHECK ("discount_type" IN ('percent', 'fixed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "coupons" ADD CONSTRAINT "coupons_discount_value_check"
        CHECK ("discount_value" > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_tenant_id_code_key" ON "coupons"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "coupons_tenant_id_idx" ON "coupons"("tenant_id");

-- ============================================================
-- coupon_redemptions
-- ============================================================
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
    "id"             UUID NOT NULL,
    "tenant_id"      UUID NOT NULL,
    "coupon_id"      UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "customer_email" TEXT,
    "discount_cents" INTEGER NOT NULL,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_appointment_id_key"
    ON "coupon_redemptions"("appointment_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_tenant_id_idx" ON "coupon_redemptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_idx" ON "coupon_redemptions"("coupon_id");

DO $$ BEGIN
    ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey"
        FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_appointment_id_fkey"
        FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- RLS: tenant isolation (igual appointments/payments/reviews). ADR-021 §6.
-- ============================================================
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "coupons_tenant_isolation" ON "coupons"
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "coupon_redemptions" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "coupon_redemptions_tenant_isolation" ON "coupon_redemptions"
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
