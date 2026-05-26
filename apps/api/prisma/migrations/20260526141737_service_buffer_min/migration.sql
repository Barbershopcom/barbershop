-- AlterTable
ALTER TABLE "services" ADD COLUMN     "buffer_min" INTEGER NOT NULL DEFAULT 0;

-- Domain constraint: buffer entre 0 e 4h. Acima de 4h é configuration error.
ALTER TABLE services ADD CONSTRAINT services_buffer_min_check
  CHECK (buffer_min >= 0 AND buffer_min <= 240);
