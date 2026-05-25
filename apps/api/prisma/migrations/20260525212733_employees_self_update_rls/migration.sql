-- UPDATE policy pra barbeiro editar o próprio employee depois de vinculado.
--
-- PATCH /me/employee no mobile permite editar displayName, etc do próprio
-- perfil. RLS protege contra editar OUTRO employee (USING filtra por
-- app.user_id) e contra mudar app_user_id pra outro user (WITH CHECK).
--
-- App-level validação restringe quais campos podem ser editados (não pode
-- mudar role/isActive/tenantId/barbershopId — só admin via web faz isso).

CREATE POLICY employees_self_update_linked ON employees
  FOR UPDATE
  USING (app_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (app_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);
