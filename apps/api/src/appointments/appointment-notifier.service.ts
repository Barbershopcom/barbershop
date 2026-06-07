import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { formatPriceBRL, tenantContactVars } from '../email/format';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import {
  AppointmentStatusService,
  type AppointmentTransitionEvent,
} from './appointment-status.service';

/**
 * Dispara notificações (push + email vintage) nas transições de status
 * (ADR-017 §5). Plugado na state machine via registerNotifier — assim o
 * AppointmentStatusService não fica acoplado a email/push.
 *
 *   confirmed → cliente (push + email "confirmado")
 *   rejected  → cliente (push + email "cancelado/estornado")
 *   expired   → cliente (push + email "cancelado/estornado")
 *
 * Separado: notifyNewPending() avisa o BARBEIRO de uma nova reserva
 * (chamado pelo PaymentService quando paga). Push via employee_devices.
 *
 * Tudo best-effort: falha de notificação nunca quebra a transição.
 */
@Injectable()
export class AppointmentNotifier implements OnModuleInit {
  private static readonly logger = new Logger(AppointmentNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly push: PushService,
    private readonly apptStatus: AppointmentStatusService,
  ) {}

  onModuleInit(): void {
    this.apptStatus.registerNotifier((event, apptId) =>
      this.onTransition(event, apptId),
    );
  }

  /** Hook chamado pela state machine após confirmar/recusar/expirar. */
  private async onTransition(
    event: AppointmentTransitionEvent,
    appointmentId: string,
  ): Promise<void> {
    const ctx = await this.loadContext(appointmentId);
    if (!ctx) return;

    if (event === 'confirmed') {
      await this.notifyClientConfirmed(ctx);
    } else {
      // rejected | expired — mesma mensagem pro cliente (não foi confirmado)
      await this.notifyClientNotConfirmed(ctx, event);
    }
  }

  /** Avisa o barbeiro que tem uma nova reserva pra confirmar (novo pending). */
  async notifyNewPending(appointmentId: string): Promise<void> {
    const ctx = await this.loadContext(appointmentId);
    if (!ctx || !ctx.barberAppUserId) return;
    const tokens = await this.employeeTokens(ctx.barberAppUserId);
    if (tokens.length === 0) return;
    await this.push.send({
      tokens,
      title: 'Nova reserva pra confirmar',
      body: `${ctx.customerName} — ${ctx.serviceName} em ${ctx.dateLabel} ${ctx.timeLabel}. Confirme no app.`,
      data: { appointmentId, kind: 'new_pending' },
    });
  }

  private async notifyClientConfirmed(ctx: ApptContext): Promise<void> {
    if (ctx.customerEmail) {
      void this.email.sendBookingConfirmation({
        to: ctx.customerEmail,
        vars: this.emailVars(ctx),
      });
    }
    await this.pushToCustomer(ctx, {
      title: 'Agendamento confirmado! ✂️',
      body: `${ctx.tenantName} confirmou seu corte em ${ctx.dateLabel} ${ctx.timeLabel}.`,
      kind: 'confirmed',
    });
  }

  private async notifyClientNotConfirmed(
    ctx: ApptContext,
    event: AppointmentTransitionEvent,
  ): Promise<void> {
    if (ctx.customerEmail) {
      void this.email.sendBookingCancelled({
        to: ctx.customerEmail,
        vars: this.emailVars(ctx),
      });
    }
    const reason =
      event === 'expired'
        ? 'não foi confirmado a tempo'
        : 'foi recusado pelo barbeiro';
    await this.pushToCustomer(ctx, {
      title: 'Agendamento não confirmado',
      body: `Seu corte em ${ctx.tenantName} ${reason}. O valor foi estornado.`,
      kind: event,
    });
  }

  private async pushToCustomer(
    ctx: ApptContext,
    msg: { title: string; body: string; kind: string },
  ): Promise<void> {
    if (!ctx.customerPhone) return;
    const tokens = await this.customerTokens(ctx.customerPhone);
    if (tokens.length === 0) return;
    await this.push.send({
      tokens,
      title: msg.title,
      body: msg.body,
      data: { appointmentId: ctx.id, kind: msg.kind },
    });
  }

  private emailVars(ctx: ApptContext) {
    return {
      tenantName: ctx.tenantName,
      customerName: ctx.customerName,
      dateLabel: ctx.dateLabel,
      timeLabel: ctx.timeLabel,
      durationLabel: ctx.durationLabel,
      serviceName: ctx.serviceName,
      barberName: ctx.barberName,
      priceLabel: formatPriceBRL(ctx.priceCents),
      ...tenantContactVars({
        name: ctx.tenantName,
        phoneE164: ctx.tenantPhone,
        addressLine: ctx.tenantAddress,
        instagramHandle: ctx.tenantInstagram,
      }),
    };
  }

  /** Carrega tudo que as notificações precisam num único query. */
  private async loadContext(appointmentId: string): Promise<ApptContext | null> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        tenantId: true,
        startAt: true,
        priceCents: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        service: { select: { name: true, durationMin: true } },
        barber: { select: { displayName: true, appUserId: true } },
      },
    });
    if (!appt) {
      AppointmentNotifier.logger.warn(`Notify: appt ${appointmentId} sumiu`);
      return null;
    }
    // Barbershop não tem relation `tenant` no schema (só tenantId escalar
    // no Appointment) — busca o tenant separado.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.tenantId },
      select: {
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    if (!tenant) {
      AppointmentNotifier.logger.warn(`Notify: tenant ${appt.tenantId} sumiu`);
      return null;
    }
    const tz = tenant.timezone;
    return {
      id: appt.id,
      tenantName: tenant.name,
      tenantPhone: tenant.phoneE164,
      tenantAddress: tenant.addressLine,
      tenantInstagram: tenant.instagramHandle,
      customerName: appt.customerName,
      customerEmail: appt.customerEmail,
      customerPhone: appt.customerPhone,
      serviceName: appt.service.name,
      durationLabel: formatDuration(appt.service.durationMin),
      barberName: appt.barber.displayName,
      barberAppUserId: appt.barber.appUserId,
      priceCents: appt.priceCents,
      dateLabel: formatDate(appt.startAt, tz),
      timeLabel: formatTime(appt.startAt, tz),
    };
  }

  /** Tokens push do cliente (por telefone). SQL raw — tabela fora do client. */
  private async customerTokens(customerPhone: string): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ expo_push_token: string }>>`
        SELECT expo_push_token FROM customer_devices WHERE customer_phone = ${customerPhone}
      `;
      return rows.map((r) => r.expo_push_token);
    } catch (err) {
      AppointmentNotifier.logger.warn(
        `customerTokens falhou: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  /** Tokens push do barbeiro (por appUserId). */
  private async employeeTokens(appUserId: string): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ expo_push_token: string }>>`
        SELECT expo_push_token FROM employee_devices WHERE app_user_id = ${appUserId}::uuid
      `;
      return rows.map((r) => r.expo_push_token);
    } catch (err) {
      AppointmentNotifier.logger.warn(
        `employeeTokens falhou: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }
}

interface ApptContext {
  id: string;
  tenantName: string;
  tenantPhone: string | null;
  tenantAddress: string | null;
  tenantInstagram: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  durationLabel: string;
  barberName: string;
  barberAppUserId: string | null;
  priceCents: number;
  dateLabel: string;
  timeLabel: string;
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
