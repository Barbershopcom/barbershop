import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppointmentStatusService } from '../appointments/appointment-status.service';
import { EmailService } from '../email/email.service';
import { formatPriceBRL, tenantContactVars } from '../email/format';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
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
    private readonly push: PushService,
    private readonly apptStatus: AppointmentStatusService,
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
    await boss.createQueue(APPOINTMENT_EXPIRATION_QUEUE);

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

    // Expiration worker — pending vencido → expired (ADR-017 §2).
    await boss.work<ExpirationPayload>(
      APPOINTMENT_EXPIRATION_QUEUE,
      { batchSize: 5 },
      async (batch) => {
        for (const job of batch) {
          await this.apptStatus.expire(job.data.apptId);
        }
      },
    );
    JobsWorkerService.logger.log(`Worker registrado: ${APPOINTMENT_EXPIRATION_QUEUE}`);

    // Cleanup worker
    await boss.work(IDEMPOTENCY_CLEANUP_QUEUE, async () => this.handleCleanup());
    JobsWorkerService.logger.log(`Worker registrado: ${IDEMPOTENCY_CLEANUP_QUEUE}`);

    // Agenda cleanup recorrente: 4am UTC todo dia.
    await boss.schedule(IDEMPOTENCY_CLEANUP_QUEUE, '0 4 * * *', undefined, { tz: 'UTC' });
    JobsWorkerService.logger.log('Cleanup recorrente agendado: 0 4 * * * UTC');

    // Faxina de barbearias pendentes (email não confirmado em 3 dias).
    await boss.createQueue(PENDING_TENANT_CLEANUP_QUEUE);
    await boss.work(PENDING_TENANT_CLEANUP_QUEUE, async () => this.handlePendingTenantCleanup());
    await boss.schedule(PENDING_TENANT_CLEANUP_QUEUE, '30 4 * * *', undefined, { tz: 'UTC' });
    JobsWorkerService.logger.log(`Worker + agenda: ${PENDING_TENANT_CLEANUP_QUEUE} (30 4 * * * UTC)`);
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
        customerPhone: true,
        service: { select: { name: true, durationMin: true, basePriceCents: true } },
        barber: { select: { displayName: true } },
        barbershop: { select: { tenantId: true } },
      },
    });

    if (!appt) {
      JobsWorkerService.logger.warn(`Reminder skip: appointment ${payload.apptId} sumiu`);
      return;
    }
    // Só lembra appointment confirmado pelo barbeiro (ADR-016 §3).
    // pending/awaiting_payment ainda não são compromisso firme.
    if (appt.status !== 'confirmed') {
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

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.barbershop.tenantId },
      select: {
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    if (!tenant) {
      JobsWorkerService.logger.warn(`Reminder skip: tenant não encontrado pra ${appt.id}`);
      return;
    }

    // Push tokens registrados pra esse customerPhone (ADR-010 §5/§8).
    const pushTokens = appt.customerPhone
      ? await this.lookupPushTokens(appt.customerPhone)
      : [];

    if (!appt.customerEmail && pushTokens.length === 0) {
      // Sem canal — marca enviado pra não fazer retry infinito.
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      return;
    }

    const dateLabel = formatDate(appt.startAt, tenant.timezone);
    const timeLabel = formatTime(appt.startAt, tenant.timezone);

    // Push best-effort — falha não trava email.
    if (pushTokens.length > 0) {
      void this.push.send({
        tokens: pushTokens,
        title: `Seu corte é amanhã em ${tenant.name}`,
        body: `${appt.service.name} com ${appt.barber.displayName} — ${dateLabel}, ${timeLabel}.`,
        data: { apptId: appt.id, tenantName: tenant.name },
      });
    }

    if (appt.customerEmail) {
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
          dateLabel,
          timeLabel,
          durationLabel: formatDuration(appt.service.durationMin),
          serviceName: appt.service.name,
          barberName: appt.barber.displayName,
          priceLabel: formatPriceBRL(appt.service.basePriceCents),
          cancelUrl,
          ...tenantContactVars(tenant),
        },
      });

      if (!result.ok) {
        // Throw força pg-boss retry com backoff
        throw new Error(`Falha no envio: ${result.error ?? 'unknown'}`);
      }
    }

    await this.prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
  }

  /**
   * Busca tokens Expo Push registrados pra esse telefone. SQL raw porque
   * customer_devices não está no Prisma client gerado (ADR-010 §8).
   */
  private async lookupPushTokens(customerPhone: string): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ expo_push_token: string }>>`
        SELECT expo_push_token FROM customer_devices WHERE customer_phone = ${customerPhone}
      `;
      return rows.map((r) => r.expo_push_token);
    } catch (err) {
      JobsWorkerService.logger.warn(
        `Falha ao buscar push tokens: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  private async handleCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Limpar idempotency_keys antigos (>24h)
    const idempotencyResult = await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    JobsWorkerService.logger.log(
      `Cleanup: removidas ${idempotencyResult.count} idempotency_keys antigos`,
    );

    // 2. Monitorar coupon counts: se times_redeemed > redemptions reais,
    // significa reservas vazaram (booking falhou sem chamar releaseReservation).
    // Isso é detectado aqui para monitoramento/alertas. A correção deve ser feita
    // nos handlers de cancelamento de appointment (ADR-021 §7).
    try {
      const discrepancies = await this.prisma.$queryRaw<
        Array<{ coupon_id: string; times_redeemed: number; actual_redemptions: number }>
      >`
        SELECT c.id as coupon_id, c.times_redeemed,
               COALESCE(COUNT(cr.id), 0) as actual_redemptions
        FROM coupons c
        LEFT JOIN coupon_redemptions cr ON cr.coupon_id = c.id
        GROUP BY c.id, c.times_redeemed
        HAVING c.times_redeemed > COALESCE(COUNT(cr.id), 0)
      `;

      if (discrepancies.length > 0) {
        JobsWorkerService.logger.warn(
          `Cleanup: ${discrepancies.length} coupons com reservas vazadas (times_redeemed > actual_redemptions). ` +
            `Garanta que releaseReservation() é chamado no cancelamento: ${JSON.stringify(
              discrepancies.slice(0, 3),
            )}`,
        );
      }
    } catch (err) {
      JobsWorkerService.logger.warn(
        `Cleanup de coupon counts falhou: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Faxina de barbearias `pending` (email do dono não confirmado) com mais de
   * 3 dias: apaga o tenant (cascade) e, se o dono não tiver mais nenhuma
   * barbearia, apaga o app_user + o usuário no Supabase Auth (best-effort).
   */
  private async handlePendingTenantCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const pending = await this.prisma.tenant.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      select: { id: true, memberships: { select: { userId: true } } },
    });
    if (pending.length === 0) return;

    const tenantIds = pending.map((t) => t.id);
    const candidateUserIds = [
      ...new Set(pending.flatMap((t) => t.memberships.map((m) => m.userId))),
    ];

    // Apaga os tenants (cascade leva org/location/barbershop/subscription/membership).
    await this.prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    JobsWorkerService.logger.log(
      `Faxina: ${tenantIds.length} barbearia(s) pendente(s) > 3 dias apagada(s).`,
    );

    // Dono que ficou sem nenhuma barbearia → apaga a conta (DB + Supabase Auth).
    for (const userId of candidateUserIds) {
      const remaining = await this.prisma.tenantMembership.count({ where: { userId } });
      if (remaining > 0) continue;
      await this.prisma.appUser.delete({ where: { id: userId } }).catch((err) => {
        JobsWorkerService.logger.warn(
          `Faxina: falha ao apagar app_user ${userId}: ${err instanceof Error ? err.message : err}`,
        );
      });
      await this.deleteSupabaseAuthUser(userId);
    }
  }

  /** Apaga o usuário no Supabase Auth via admin API (best-effort). */
  private async deleteSupabaseAuthUser(userId: string): Promise<void> {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return; // sem service-role key → pula (deixa órfão)
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { apikey: key, authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        JobsWorkerService.logger.warn(`Faxina: Supabase admin delete ${userId} → ${res.status}`);
      }
    } catch (err) {
      JobsWorkerService.logger.warn(
        `Faxina: erro ao apagar usuário Supabase ${userId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

export const APPOINTMENT_REMINDER_QUEUE = 'appointment-reminder';
export const IDEMPOTENCY_CLEANUP_QUEUE = 'idempotency-cleanup';
export const PENDING_TENANT_CLEANUP_QUEUE = 'pending-tenant-cleanup';
export const APPOINTMENT_EXPIRATION_QUEUE = 'appointment-expiration';

export interface ReminderPayload {
  apptId: string;
}

export interface ExpirationPayload {
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
