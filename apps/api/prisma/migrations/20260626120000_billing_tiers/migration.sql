-- Planos por tier (Free/Basic/Pro). Adiciona `tier` e torna `trial_ends_at`
-- nullable (Free não tem trial).

-- DEFAULT temporário backfilla linhas existentes; depois removemos o default
-- pra que novos inserts sejam obrigados a especificar o tier (espelha o
-- modelo Prisma, que não tem default).
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'pro';
ALTER TABLE "subscriptions" ALTER COLUMN "tier" DROP DEFAULT;

ALTER TABLE "subscriptions" ALTER COLUMN "trial_ends_at" DROP NOT NULL;
