-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "reminder_sent_at" TIMESTAMPTZ(6);

-- Index parcial pra worker varrer só os pendentes (booked + reminder não enviado).
-- Não inclui já-enviados nem cancelados — fica pequeno e rápido.
CREATE INDEX appointments_reminder_pending_idx
  ON appointments(start_at)
  WHERE status = 'booked' AND reminder_sent_at IS NULL;
