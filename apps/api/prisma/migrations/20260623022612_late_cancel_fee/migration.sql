-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN "late_cancel_fee_pct" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "cancel_fee_cents" INTEGER NOT NULL DEFAULT 0;
