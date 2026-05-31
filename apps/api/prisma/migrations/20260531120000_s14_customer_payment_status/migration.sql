-- Sprint 14 (ADR-016): Customer accounts + Payment + status workflow.

-- ============================================================
-- 1. customers — perfil de cliente final (espelha employees).
--    NÃO tenant-scoped (cliente reserva em N barbearias), igual
--    customer_devices. Acesso via role bypassRLS + filtro explícito.
-- ============================================================
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "app_user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone_e164" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_app_user_id_key" ON "customers"("app_user_id");

ALTER TABLE "customers" ADD CONSTRAINT "customers_app_user_id_fkey"
    FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 2. appointments — novos campos + migração de status.
-- ============================================================
ALTER TABLE "appointments"
    ADD COLUMN "customer_id" UUID,
    ADD COLUMN "price_cents" INTEGER NOT NULL DEFAULT 0;

-- Migra status do mundo antigo pro novo (ADR-016 §3):
--   booked → confirmed (booking antigo = ativo direto, sem workflow)
--   completed/cancelled/no_show → iguais
UPDATE "appointments" SET "status" = 'confirmed' WHERE "status" = 'booked';

-- Novo default pra bookings futuros (nascem aguardando pagamento)
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'awaiting_payment';

-- FK + índice de customer
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id");

-- ============================================================
-- 3. EXCLUDE constraint — cobre os status que OCUPAM o slot.
--    Antes: WHERE status = 'booked'.
--    Agora: awaiting_payment | pending | confirmed (ativos).
--    completed/cancelled/expired/no_show liberam o horário.
-- ============================================================
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_no_overlap";

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
    EXCLUDE USING gist (
        barber_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    ) WHERE (status IN ('awaiting_payment', 'pending', 'confirmed'));

-- ============================================================
-- 4. payments — payment-ready desde o mock (ADR-016 §5).
--    Tenant-scoped com RLS (consistente com outras tabelas do tenant).
-- ============================================================
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount_cents" INTEGER NOT NULL,
    "fee_cents" INTEGER NOT NULL DEFAULT 0,
    "platform_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "provider_payment_id" TEXT,
    "provider_payload" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_appointment_id_key" ON "payments"("appointment_id");
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_tenant_isolation" ON "payments"
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
