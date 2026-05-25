-- App role com NOBYPASSRLS — necessário pra RLS funcionar.
--
-- Neon: `neondb_owner` (role default da conexão) tem rolbypassrls=true, o que
-- silenciosamente desativa TODAS as policies. Padrão da indústria (mesmo do
-- Supabase com `authenticator → authenticated`): criar role secundário sem
-- bypass e usar SET LOCAL ROLE no início de cada transação tenant-scoped.
--
-- TenantInterceptor faz por request (Phase 2):
--   await tx.$executeRaw`SET LOCAL ROLE app_user`;
--   await tx.$executeRaw`SET LOCAL app.user_id = ${userId}`;
--   await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`;

-- 1) Cria role idempotente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

-- 2) neondb_owner precisa "ser membro" de app_user pra poder SET LOCAL ROLE
GRANT app_user TO neondb_owner;

-- 3) Grants DML em schema public
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 4) Garantia pra futuras tabelas criadas por neondb_owner (toda migration futura)
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
