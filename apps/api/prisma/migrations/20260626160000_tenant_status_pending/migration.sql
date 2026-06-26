-- Status do tenant: 'pending' (email do dono não confirmado) | 'active'.
-- DEFAULT 'active' backfilla tenants existentes; o onboarding insere 'pending'.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
