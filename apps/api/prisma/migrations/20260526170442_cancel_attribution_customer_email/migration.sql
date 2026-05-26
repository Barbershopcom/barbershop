-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_by" TEXT,
ADD COLUMN     "customer_email" TEXT;

-- Domain constraint: cancelled_by só pode ser 3 valores conhecidos.
ALTER TABLE appointments ADD CONSTRAINT appointments_cancelled_by_check
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'admin', 'system'));

-- Index parcial pra queries de cancel analytics (raras mas barata).
CREATE INDEX appointments_cancelled_by_idx ON appointments(cancelled_by)
  WHERE cancelled_by IS NOT NULL;
