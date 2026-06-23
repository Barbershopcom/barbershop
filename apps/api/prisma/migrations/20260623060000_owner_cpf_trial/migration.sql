-- CreateIndex: CPF único em app_users — uma pessoa (CPF) só abre 1 conta/
-- trial (anti-abuso). NULLs múltiplos são permitidos pelo Postgres, então
-- contas sem CPF não conflitam. Idempotente p/ aplicação manual segura.
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_cpf_key" ON "app_users"("cpf");

-- AlterTable: tenants ganha CPF do criador (desnormalizado p/ suporte) e a
-- data de fim do teste grátis (base para billing/lembretes futuros).
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "owner_cpf" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ(6);
