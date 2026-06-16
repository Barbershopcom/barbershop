import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  bookingCancelledTemplate,
  bookingConfirmationTemplate,
  bookingReminderTemplate,
  bookingRescheduledTemplate,
  paymentReceivedTemplate,
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

  async sendPaymentReceived(args: {
    to: string;
    vars: BookingTemplateVars;
  }): Promise<{ ok: boolean; error?: string }> {
    const html = paymentReceivedTemplate(args.vars);
    return this.send({
      to: args.to,
      subject: `Pagamento recebido — ${args.vars.tenantName}`,
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

  /**
   * Enviar convite de employee (barbeiro/admin)
   *
   * Token deve ser JWT com exp=7d (ADR-025 §3)
   * URL de onboarding: https://app.barbearia.com/employee/onboard?token=...
   */
  async sendEmployeeInvite(args: {
    to: string;
    employeeName: string;
    tenantName: string;
    onboardingToken: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const { employeeName, tenantName, onboardingToken } = args;
    const onboardingUrl = `https://app.barbearia.com/employee/onboard?token=${encodeURIComponent(onboardingToken)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { color: #1a365d; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #1a365d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .footer { color: #8a8073; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5ddd0; padding-top: 20px; }
    code { background: #f5f5f5; padding: 8px 12px; display: inline-block; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Bem-vindo à ${this.escapeHtml(tenantName)}! 💈</div>

    <p>Olá <strong>${this.escapeHtml(employeeName)}</strong>,</p>

    <p>Você foi convidado para gerenciar agendamentos na plataforma <strong>Barbearia</strong>.</p>

    <p>Clique no botão abaixo para finalizar seu cadastro e começar a usar:</p>

    <center>
      <a href="${this.escapeHtml(onboardingUrl)}" class="button">Aceitar Convite</a>
    </center>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Se o botão não funcionar, copie este link:<br>
      <code>${this.escapeHtml(onboardingUrl)}</code>
    </p>

    <p style="color: #666; margin-top: 30px;">
      ⏰ <strong>Este link expira em 7 dias.</strong> Após isso, peça ao seu gerente para enviar um novo convite.
    </p>

    <div class="footer">
      <p>© 2026 Barbearia. Todos os direitos reservados.</p>
      <p>Precisa de ajuda? Responda este email para contatar o suporte.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.send({
      to: args.to,
      subject: `Convite para ${tenantName} — Barbearia`,
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

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
