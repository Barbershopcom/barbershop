import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { encodeCancelToken } from '../slots/cancel-token';
import { JobsService } from './jobs.service';

/**
 * Registra os handlers de jobs no boot. Roda APÓS JobsService inicializar
 * (OnApplicationBootstrap é depois de OnModuleInit).
 *
 * Decisões (ADR-007):
 *  - Idempotência via coluna `reminder_sent_at` (worker checa antes/depois)
 *  - Job ignora silenciosamente se appointment foi cancelado
 *  - Sem retry manual — pg-boss faz retry com backoff exponencial
 */
@Injectable()
export class JobsWorkerService implements OnApplicationBootstrap {
  private static readonly logger = new Logger(JobsWorkerService.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    let boss;
    try {
      boss = this.jobs.instance;
    } catch {
      JobsWorkerService.logger.warn('JobsService desabilitado — workers não registrados.');
      return;
    }

    // Cria as queues antes de registrar handlers (pg-boss v10+ exige createQueue)
    await boss.createQueue(APPOINTMENT_REMINDER_QUEUE);
    await boss.createQueue(IDEMPOTENCY_CLEANUP_QUEUE);

    // Reminder worker. pg-boss entrega batch de 1+ jobs; processamos
    // sequencialmente pra log limpo (volume é baixo, paralelismo não vale a pena).
    await boss.work<ReminderPayload>(
      APPOINTMENT_REMINDER_QUEUE,
      { batchSize: 5 },
      async (batch) => {
        for (const job of batch) {
          await this.handleReminder(job.data);
        }
      },
    );
    JobsWorkerService.logger.log(`Worker registrado: ${APPOINTMENT_REMINDER_QUEUE}`);

    // Cleanup worker
    await boss.work(IDEMPOTENCY_CLEANUP_QUEUE, async () => this.handleCleanup());
    JobsWorkerService.logger.log(`Worker registrado: ${IDEMPOTENCY_CLEANUP_QUEUE}`);

    // Agenda cleanup recorrente: 4am UTC todo dia.
    await boss.schedule(IDEMPOTENCY_CLEANUP_QUEUE, '0 4 * * *', undefined, { tz: 'UTC' });
    JobsWorkerService.logger.log('Cleanup recorrente agendado: 0 4 * * * UTC');
  }

  private async handleReminder(payload: ReminderPayload): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: payload.apptId },
      select: {
        id: true,
        status: true,
        reminderSentAt: true,
        startAt: true,
        customerName: true,
        customerEmail: true,
        service: { select: { name: true, durationMin: true } },
        barber: { select: { displayName: true } },
        barbershop: { select: { tenantId: true } },
      },
    });

    if (!appt) {
      JobsWorkerService.logger.warn(`Reminder skip: appointment ${payload.apptId} sumiu`);
      return;
    }
    if (appt.status !== 'booked') {
      JobsWorkerService.logger.debug(
        `Reminder skip: appointment ${payload.apptId} está '${appt.status}'`,
      );
      return;
    }
    if (appt.reminderSentAt) {
      JobsWorkerService.logger.debug(
        `Reminder skip: appointment ${payload.apptId} já notificado`,
      );
      return;
    }
    if (!appt.customerEmail) {
      // Marca enviado pra não fazer retry infinito buscando um email que não existe
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.barbershop.tenantId },
      select: { name: true, timezone: true },
    });
    if (!tenant) {
      JobsWorkerService.logger.warn(`Reminder skip: tenant não encontrado pra ${appt.id}`);
      return;
    }

    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET');
    const webUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'http://localhost:3000';
    let cancelUrl: string | undefined;
    if (secret) {
      const token = encodeCancelToken(
        { apptId: appt.id, exp: Math.floor(appt.startAt.getTime() / 1000) },
        secret,
      );
      cancelUrl = `${webUrl}/cancel/${token}`;
    }

    const result = await this.email.sendBookingReminder({
      to: appt.customerEmail,
      vars: {
        tenantName: tenant.name,
        customerName: appt.customerName,
        dateLabel: formatDate(appt.startAt, tenant.timezone),
        timeLabel: formatTime(appt.startAt, tenant.timezone),
        durationLabel: formatDuration(appt.service.durationMin),
        serviceName: appt.service.name,
        barberName: appt.barber.displayName,
        cancelUrl,
      },
    });

    if (!result.ok) {
      // Throw força pg-boss retry com backoff
      throw new Error(`Falha no envio: ${result.error ?? 'unknown'}`);
    }

    await this.prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
  }

  private async handleCleanup(): Promise<void> {
    // DELETE FROM idempotency_keys WHERE created_at < now() - interval '24h'
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    JobsWorkerService.logger.log(`Cleanup: removidas ${result.count} idempotency_keys`);
  }
}

export const APPOINTMENT_REMINDER_QUEUE = 'appointment-reminder';
export const IDEMPOTENCY_CLEANUP_QUEUE = 'idempotency-cleanup';

export interface ReminderPayload {
  apptId: string;
}

function formatDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
