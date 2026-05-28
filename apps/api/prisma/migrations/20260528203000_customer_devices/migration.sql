-- ADR-010 §5/§8: tokens de Expo Push pra notificações.
-- Sem RLS — endpoint público de booking insere; reminder worker lê.
-- Vinculação por customerPhone (proxy de identidade até cliente ter conta).

CREATE TABLE "customer_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expo_push_token" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_devices_expo_push_token_key" ON "customer_devices"("expo_push_token");
CREATE INDEX "customer_devices_customer_phone_idx" ON "customer_devices"("customer_phone");

-- Tabela é acessada via bypassRLS role (mesma estratégia de slots/booking).
-- Não habilitamos RLS — cliente não está vinculado a tenant.
