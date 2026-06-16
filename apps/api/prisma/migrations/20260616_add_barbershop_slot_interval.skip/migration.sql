-- Adiciona campo slotIntervalMin para future-proofing (ADR-004 extensão).
-- Permite ajuste de intervalo de slots por loja sem migração schema.
-- Default 30 minutos (status quo atual).

ALTER TABLE "barbershops" ADD COLUMN "slot_interval_min" INTEGER NOT NULL DEFAULT 30;

-- Índice para filtragens futuras se necessário
CREATE INDEX "barbershops_slot_interval_min_idx" ON "barbershops"("slot_interval_min");
