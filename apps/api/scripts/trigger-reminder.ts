/**
 * Dispara manualmente um job de reminder pra um appointment específico.
 * Útil pra smoke test sem ter que esperar 24h.
 *
 * Uso:
 *   pnpm --filter @barbearia/api trigger:reminder -- --appt <uuid>
 *
 * Bypassa a regra "skip se < 24h" do BookingService — insere direto na queue.
 * Worker pega no próximo tick (≤2s), tenta enviar email, marca reminder_sent_at.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--appt');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Uso: trigger:reminder -- --appt <uuid>');
    process.exit(1);
  }
  const apptId = args[idx + 1];

  const prisma = new PrismaClient();
  try {
    // Confirma que o appointment existe
    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      select: { id: true, status: true, customerEmail: true, reminderSentAt: true },
    });
    if (!appt) {
      console.error(`Appointment ${apptId} não encontrado.`);
      process.exit(1);
    }
    console.log(
      `Appointment: status=${appt.status}, email=${appt.customerEmail ?? '(null)'}, reminderSentAt=${appt.reminderSentAt?.toISOString() ?? '(null)'}`,
    );

    // Insere job direto na queue
    const payload = JSON.stringify({ apptId });
    await prisma.$executeRawUnsafe(
      `INSERT INTO pgboss.job (name, data, retry_limit, retry_backoff, policy) VALUES ('appointment-reminder', $$${payload}$$::jsonb, 3, true, 'standard')`,
    );
    console.log(`Reminder disparado pra ${apptId}. Aguarda ~5s e checa o inbox.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
