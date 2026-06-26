-- Verificação de email "soft" (não bloqueia login; banner no admin até confirmar).
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
