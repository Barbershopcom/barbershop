-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "barbershop_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_tenant_id_idx" ON "appointments"("tenant_id");

-- CreateIndex
CREATE INDEX "appointments_barber_id_start_at_idx" ON "appointments"("barber_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_barbershop_id_start_at_idx" ON "appointments"("barbershop_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('booked', 'cancelled', 'completed', 'no_show'));
ALTER TABLE appointments ADD CONSTRAINT appointments_time_order_check
  CHECK (end_at > start_at);

-- Index parcial pra slots: só linhas que ainda bloqueiam horário.
-- (status='cancelled'|'no_show' não contam pra subtração de slots)
CREATE INDEX appointments_active_barber_time_idx
  ON appointments(barber_id, start_at, end_at)
  WHERE status = 'booked';

-- RLS: tenant-scoped pattern (ADR-002 §4). Reads autenticados usam
-- app.tenant_id como sempre. Endpoint público (ADR-004 §5) usa
-- PrismaPublicService com BYPASSRLS, sem depender dessas policies.
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE  ROW LEVEL SECURITY;
CREATE POLICY appointments_tenant_iso ON appointments
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
