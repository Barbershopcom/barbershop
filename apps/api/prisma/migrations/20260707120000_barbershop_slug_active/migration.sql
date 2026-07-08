-- Multi-unidade (spec 2026-07-07): slug público por unidade + ativação.
ALTER TABLE barbershops ADD COLUMN slug TEXT;
ALTER TABLE barbershops ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill: 1ª unidade herda o slug do tenant; extras (não deveriam existir
-- hoje) ganham sufixo -2, -3… pra não colidir no UNIQUE.
WITH ranked AS (
  SELECT b.id, t.slug AS tslug,
         ROW_NUMBER() OVER (PARTITION BY b.tenant_id ORDER BY b.created_at) AS rn
  FROM barbershops b JOIN tenants t ON t.id = b.tenant_id
)
UPDATE barbershops b
SET slug = CASE WHEN r.rn = 1 THEN r.tslug ELSE r.tslug || '-' || r.rn END
FROM ranked r WHERE r.id = b.id;

ALTER TABLE barbershops ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX barbershops_slug_key ON barbershops(slug);
