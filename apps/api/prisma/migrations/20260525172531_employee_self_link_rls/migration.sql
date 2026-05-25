-- RLS adicional pra suportar auto-link de Employee↔AppUser via email.
--
-- Fluxo: barbeiro loga no mobile → backend chama /me/employee/link
--   → busca employee não-vinculado com email do JWT → set employee.app_user_id
--   → cria tenant_membership com roles derivados de employee.role
--
-- O TenantInterceptor passa a setar 3 GUCs:
--   app.user_id     (sub do JWT)
--   app.user_email  (email do JWT) ← NOVO
--   app.tenant_id   (header X-Tenant-Id, opcional)
--
-- Como o auto-link acontece ANTES do user ter membership/tenant, não há
-- app.tenant_id setado. Policies abaixo permitem SELECT/UPDATE de employees
-- candidatos via email match, sem precisar de tenant context.

-- Permite ver employees não-vinculados com seu email (pra checar "tem alguém me cadastrou?")
CREATE POLICY employees_self_link_select ON employees
  FOR SELECT
  USING (
    app_user_id IS NULL
    AND email = NULLIF(current_setting('app.user_email', true), '')
  );

-- Permite UPDATE pra fazer o link (set app_user_id = meu sub)
CREATE POLICY employees_self_link_update ON employees
  FOR UPDATE
  USING (
    app_user_id IS NULL
    AND email = NULLIF(current_setting('app.user_email', true), '')
  )
  WITH CHECK (
    app_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

-- Permite ver o próprio employee depois de vinculado, sem precisar de tenant context.
-- Útil pro GET /me/employee no mobile (rota não sabe qual tenant ainda).
CREATE POLICY employees_self_select_linked ON employees
  FOR SELECT
  USING (
    app_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );
