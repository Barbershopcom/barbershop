-- CreateTable
CREATE TABLE "barber_service_capabilities" (
    "tenant_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_service_capabilities_pkey" PRIMARY KEY ("barber_id","service_id")
);

-- CreateIndex
CREATE INDEX "barber_service_capabilities_tenant_id_idx" ON "barber_service_capabilities"("tenant_id");

-- CreateIndex
CREATE INDEX "barber_service_capabilities_service_id_idx" ON "barber_service_capabilities"("service_id");

-- AddForeignKey
ALTER TABLE "barber_service_capabilities" ADD CONSTRAINT "barber_service_capabilities_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_service_capabilities" ADD CONSTRAINT "barber_service_capabilities_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: tenant-scoped pattern (ADR-002 §4). App-level filter por barber_id = my employee.id.
ALTER TABLE barber_service_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_service_capabilities FORCE  ROW LEVEL SECURITY;
CREATE POLICY barber_service_capabilities_tenant_iso ON barber_service_capabilities
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
