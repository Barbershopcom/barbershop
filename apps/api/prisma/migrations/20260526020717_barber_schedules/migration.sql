-- CreateTable
CREATE TABLE "barber_schedules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opens_at" TEXT NOT NULL,
    "closes_at" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_schedules_tenant_id_idx" ON "barber_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "barber_schedules_barber_id_weekday_idx" ON "barber_schedules"("barber_id", "weekday");

-- AddForeignKey
ALTER TABLE "barber_schedules" ADD CONSTRAINT "barber_schedules_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: tenant-scoped pattern (ADR-002 §4). App-level filter por barber_id.
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules FORCE  ROW LEVEL SECURITY;
CREATE POLICY barber_schedules_tenant_iso ON barber_schedules
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
