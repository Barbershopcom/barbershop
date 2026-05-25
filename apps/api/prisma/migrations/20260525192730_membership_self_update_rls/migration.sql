-- UPDATE policy em tenant_memberships pra suportar sync de roles.
--
-- ADR-003 §5: employee.role é source of truth; tenant_memberships.roles é
-- derivado. No POST /me/employee/link, se a membership já existe, atualizamos
-- roles pra bater com employee.role atual.
--
-- USING permite ver a row (mesma policy de SELECT — user vê próprias memberships).
-- WITH CHECK garante que UPDATE não muda user_id pra outra pessoa.
CREATE POLICY tenant_memberships_self_update ON tenant_memberships
  FOR UPDATE
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);
