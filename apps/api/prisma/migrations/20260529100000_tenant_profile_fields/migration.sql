-- ADR-012: campos opcionais de perfil público no Tenant.
-- phone_e164: telefone WhatsApp (formato E.164, ex: +5511999999999)
-- address_line: endereço como string (sem geocoding)
-- instagram_handle: @ sem o prefixo @ (ex: barbearia_jaja)

ALTER TABLE "tenants"
  ADD COLUMN "phone_e164" TEXT,
  ADD COLUMN "address_line" TEXT,
  ADD COLUMN "instagram_handle" TEXT;

-- CHECK constraint pra E.164 (best-effort; validação rica é no app layer)
ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_phone_e164_format_check"
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

-- CHECK pra instagram handle (chars permitidos)
ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_instagram_handle_format_check"
  CHECK (instagram_handle IS NULL OR instagram_handle ~ '^[A-Za-z0-9_.]{1,30}$');
