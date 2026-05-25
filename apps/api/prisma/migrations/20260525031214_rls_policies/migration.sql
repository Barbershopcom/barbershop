-- RLS policies — deny-by-default + GUC pattern.
--
-- Convenções:
--   app.user_id    → seta no início da request (sub do JWT)
--   app.tenant_id  → seta dentro de transações tenant-scoped pelo TenantInterceptor
--
-- Tabelas:
--   tenant-scoped (filtram por app.tenant_id):
--     organizations, locations, barbershops, barbershop_hours, services, employees
--   user-scoped (filtram por app.user_id):
--     app_users (self), tenant_memberships (self)
--   tenants: visível só se há membership do user (subquery)
--
-- Uso de current_setting(name, true) — o segundo arg true faz retornar NULL
-- (em vez de erro) quando o GUC não foi setado, então queries fora de contexto
-- retornam vazio em vez de crashar.

-- ============================================================
-- USER-SCOPED: app_users
-- ============================================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users FORCE  ROW LEVEL SECURITY;

CREATE POLICY app_users_self_select ON app_users
  FOR SELECT
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY app_users_self_insert ON app_users
  FOR INSERT
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY app_users_self_update ON app_users
  FOR UPDATE
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- ============================================================
-- USER-SCOPED: tenant_memberships
-- ============================================================
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenant_memberships_self_select ON tenant_memberships
  FOR SELECT
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- INSERT é controlado pela aplicação (durante onboarding/convite),
-- então permitimos INSERT se o user_id da nova linha for o user logado
-- OU se o tenant_id bate (admin convidando outro user pro próprio tenant).
CREATE POLICY tenant_memberships_insert ON tenant_memberships
  FOR INSERT
  WITH CHECK (
    user_id   = NULLIF(current_setting('app.user_id',   true), '')::uuid
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

-- ============================================================
-- tenants — visível só se há membership
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenants_member_select ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM tenant_memberships
      WHERE user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

-- INSERT durante onboarding: qualquer user logado pode criar tenant.
-- A app deve criar a membership na mesma transação.
CREATE POLICY tenants_insert ON tenants
  FOR INSERT
  WITH CHECK (NULLIF(current_setting('app.user_id', true), '')::uuid IS NOT NULL);

-- UPDATE: só membros (a app valida role 'admin' separadamente).
CREATE POLICY tenants_member_update ON tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM tenant_memberships
      WHERE user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

-- ============================================================
-- TENANT-SCOPED — template aplicado a todas as tabelas
-- ============================================================

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE  ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant_iso ON organizations
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE  ROW LEVEL SECURITY;
CREATE POLICY locations_tenant_iso ON locations
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- barbershops
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops FORCE  ROW LEVEL SECURITY;
CREATE POLICY barbershops_tenant_iso ON barbershops
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- barbershop_hours
ALTER TABLE barbershop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_hours FORCE  ROW LEVEL SECURITY;
CREATE POLICY barbershop_hours_tenant_iso ON barbershop_hours
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services FORCE  ROW LEVEL SECURITY;
CREATE POLICY services_tenant_iso ON services
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE  ROW LEVEL SECURITY;
CREATE POLICY employees_tenant_iso ON employees
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
