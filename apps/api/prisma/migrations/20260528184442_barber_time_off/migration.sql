-- CreateTable
CREATE TABLE "barber_time_off" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_time_off_tenant_id_idx" ON "barber_time_off"("tenant_id");

-- CreateIndex
CREATE INDEX "barber_time_off_barber_id_start_at_end_at_idx" ON "barber_time_off"("barber_id", "start_at", "end_at");

-- AddForeignKey
ALTER TABLE "barber_time_off" ADD CONSTRAINT "barber_time_off_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain check: range válido (end > start)
ALTER TABLE barber_time_off ADD CONSTRAINT barber_time_off_range_check
  CHECK (end_at > start_at);

-- RLS tenant-scoped (ADR-002 §4). Mesmo padrão de barber_schedules.
ALTER TABLE barber_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_time_off FORCE  ROW LEVEL SECURITY;
CREATE POLICY barber_time_off_tenant_iso ON barber_time_off
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
