-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- btree_gist habilita EXCLUDE com mistura de igualdade (=) e range overlap (&&).
-- Já vem instalada no Neon free tier.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No-double-booking: barbeiro não pode ter 2 appointments BOOKED com overlap.
-- Cancelados/no_show/completed liberam o slot (WHERE status='booked').
-- Range half-open [start, end): appt 14-15 não conflita com 15-16.
ALTER TABLE appointments ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status = 'booked');

-- RLS pra idempotency_keys: leitura/escrita só via PrismaService default role
-- (endpoint público bypassa RLS, igual slots — ADR-004 §5 / ADR-005 §2).
-- Não criamos policy: força app-level scoping.
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE  ROW LEVEL SECURITY;
-- Sem policy = deny-all pro role app_user. Public endpoint usa role default
-- (BYPASSRLS) e filtra manualmente por tenant_id.
