import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  bookingCancelledTemplate,
  bookingConfirmationTemplate,
  bookingReminderTemplate,
  bookingRescheduledTemplate,
  type BookingTemplateVars,
  type RescheduleTemplateVars,
} from './templates';

/**
 * EmailService: wrapper sobre Resend que NUNCA throws.
 *
 * Decisões:
 *  - Booking não deve falhar se email cair (SLA email != SLA booking).
 *  - Sem RESEND_API_KEY no env, service vira no-op com warning no log
 *    (útil pra dev local sem chave configurada).
 *  - Erros do Resend retornam `{ ok: false }` — caller decide se loga
 *    extra ou ignora.
 *
 * Sprint 5: 2 templates (confirmation + cancelled). React Email entra
 * se chegarmos a 5+ ou breakage cross-client (ADR-006 §3).
 */
@Injectable()
export class EmailService {
  private static readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';

    if (!apiKey) {
      EmailService.logger.warn(
        'RESEND_API_KEY not set — EmailService vira no-op. Emails não serão enviados.',
      );
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  async sendBookingConfirmation(args: {
    to: string;
    vars: BookingTemplateVars;
  }): Promise<{ ok: boolean; error?: string }> {
    const html = bookingConfirmationTemplate(args.vars);
    return this.send({
      to: args.to,
      subject: `Agendamento confirmado — ${args.vars.tenantName}`,
      html,
    });
  }

  async sendBookingCancelled(args: {
    to: string;
    vars: BookingTemplateVars;
  }): Promise<{ ok: boolean; error?: string }> {
    const html = bookingCancelledTemplate(args.vars);
    return this.send({
      to: args.to,
      subject: `Agendamento cancelado — ${args.vars.tenantName}`,
      html,
    });
  }

  async sendBookingReminder(args: {
    to: string;
    vars: BookingTemplateVars;
  }): Promise<{ ok: boolean; error?: string }> {
    const html = bookingReminderTemplate(args.vars);
    return this.send({
      to: args.to,
      subject: `Lembrete: seu agendamento é amanhã — ${args.vars.tenantName}`,
      html,
    });
  }

  async sendBookingRescheduled(args: {
    to: string;
    vars: RescheduleTemplateVars;
  }): Promise<{ ok: boolean; error?: string }> {
    const html = bookingRescheduledTemplate(args.vars);
    return this.send({
      to: args.to,
      subject: `Agendamento remarcado — ${args.vars.tenantName}`,
      html,
    });
  }

  private async send(args: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!this.resend) {
      EmailService.logger.debug(`[no-op] would send to ${args.to}: ${args.subject}`);
      return { ok: true };
    }
    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      if (result.error) {
        EmailService.logger.warn(
          `Resend rejected email to ${args.to}: ${JSON.stringify(result.error)}`,
        );
        return { ok: false, error: result.error.message };
      }
      EmailService.logger.log(`Email enviado para ${args.to} (id=${result.data?.id})`);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      EmailService.logger.warn(`Falha ao enviar email pra ${args.to}: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}
