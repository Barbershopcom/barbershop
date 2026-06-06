-- Sprint 15 (ADR-017): Barbeiro confirma/recusa + expiração.
-- Idempotente (IF [NOT] EXISTS / DO blocks) — seguro reexecutar.

-- 1. appointments.confirm_deadline — prazo pro barbeiro confirmar.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "confirm_deadline" TIMESTAMPTZ(6);

-- 2. payments.refunded_at — quando foi estornado (recusa/expiração).
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMPTZ(6);

-- 3. employee_devices — push tokens do barbeiro/admin (ligado ao AppUser).
CREATE TABLE IF NOT EXISTS "employee_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "app_user_id" UUID NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_devices_expo_push_token_key"
    ON "employee_devices"("expo_push_token");
CREATE INDEX IF NOT EXISTS "employee_devices_app_user_id_idx"
    ON "employee_devices"("app_user_id");
