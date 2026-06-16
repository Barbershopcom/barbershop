-- Índices compostos em appointments para operações de listagem eficiente
-- Previne full table scan mesmo com RLS ativo.

-- Para GET /me/appointments (barbeiro vê seus appointments)
CREATE INDEX IF NOT EXISTS appointments_tenant_barber_start_idx
  ON appointments(tenant_id, barber_id, start_at DESC);

-- Para GET /admin/appointments (admin lista por data)
CREATE INDEX IF NOT EXISTS appointments_tenant_start_idx
  ON appointments(tenant_id, start_at DESC);

-- Para GET /me/customer-appointments (cliente vê seus appointments)
CREATE INDEX IF NOT EXISTS appointments_customer_id_start_idx
  ON appointments(customer_id, start_at DESC)
  WHERE customer_id IS NOT NULL;

-- Índice auxiliar para busca por customerEmail (guest bookings)
CREATE INDEX IF NOT EXISTS appointments_customer_email_start_idx
  ON appointments(customer_email, start_at DESC)
  WHERE customer_email IS NOT NULL;
