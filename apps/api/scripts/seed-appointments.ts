/**
 * Popular appointments de teste pra Sprint 3 (slots).
 *
 * Idempotente: limpa appointments com customer_name='__seed__' e re-insere.
 * Não toca em appointments reais.
 *
 * Uso:
 *   pnpm --filter @barbearia/api seed:appointments -- --tenant <slug>
 *
 * Cria 3 appointments hoje + amanhã pra cada barbeiro ativo do primeiro
 * barbershop do tenant, espalhados pra exercitar overlap/subtração no
 * algoritmo de slots.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const SEED_MARK = '__seed__';

async function main() {
  const args = process.argv.slice(2);
  const tenantArgIdx = args.indexOf('--tenant');
  if (tenantArgIdx === -1 || !args[tenantArgIdx + 1]) {
    console.error('Uso: seed-appointments -- --tenant <slug>');
    process.exit(1);
  }
  const slug = args[tenantArgIdx + 1];

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      console.error(`Tenant não encontrado: ${slug}`);
      process.exit(1);
    }

    const barbershop = await prisma.barbershop.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!barbershop) {
      console.error(`Nenhuma barbershop em ${slug}`);
      process.exit(1);
    }

    const barbers = await prisma.employee.findMany({
      where: { barbershopId: barbershop.id, isActive: true },
      include: { capabilities: { include: { service: true } } },
    });
    if (barbers.length === 0) {
      console.error('Nenhum employee ativo encontrado');
      process.exit(1);
    }

    // Limpa seeds anteriores
    const removed = await prisma.appointment.deleteMany({
      where: { tenantId: tenant.id, customerName: SEED_MARK },
    });
    console.log(`Removidos ${removed.count} seeds antigos`);

    // Janela: hoje + amanhã, hora "redonda" 10:00, 14:00, 16:00 UTC
    // (cliente do test deve enxergar essas zonas como bloqueadas).
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    let inserted = 0;
    for (const barber of barbers) {
      const cap = barber.capabilities[0];
      if (!cap) {
        console.log(`(skip ${barber.displayName}: sem capability)`);
        continue;
      }
      const service = cap.service;

      const baseSlots = [
        { day: today, hour: 13 }, // 13:00 UTC = 10:00 BRT
        { day: today, hour: 17 }, // 17:00 UTC = 14:00 BRT
        { day: tomorrow, hour: 19 }, // 19:00 UTC = 16:00 BRT
      ];

      for (const slot of baseSlots) {
        const startAt = new Date(slot.day);
        startAt.setUTCHours(slot.hour, 0, 0, 0);
        const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

        await prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            barbershopId: barbershop.id,
            barberId: barber.id,
            serviceId: service.id,
            customerName: SEED_MARK,
            customerPhone: null,
            startAt,
            endAt,
            status: 'booked',
          },
        });
        inserted++;
      }
      console.log(`✓ ${barber.displayName}: 3 appointments seedados`);
    }

    console.log(`\nTotal: ${inserted} appointments inseridos em ${slug}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
