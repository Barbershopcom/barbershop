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
  private readonly employeeAppUrl: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
    this.employeeAppUrl =
      config.get<string>('EMPLOYEE_APP_URL') ?? 'http://localhost:8082';

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
   * Enviar convite de employee (barbeiro/admin).
   *
   * O vínculo acontece por email-matching: o barbeiro cria conta no app com
   * ESTE email e o backend (POST /me/employee/link) vincula automaticamente.
   * Não há página que consome token — o link só leva o barbeiro ao signup.
   * `onboardingToken` fica reservado pra um fluxo token-based futuro.
   */
  async sendEmployeeInvite(args: {
    to: string;
    employeeName: string;
    tenantName: string;
    onboardingToken: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const { to, employeeName, tenantName } = args;
    const signupUrl = `${this.employeeAppUrl}/signup`;

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
    code { background: #f5f5f5; padding: 8px 12px; display: inline-block; border-radius: 4px; font-family: monospace; font-size: 13px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Bem-vindo à ${this.escapeHtml(tenantName)}! 💈</div>

    <p>Olá <strong>${this.escapeHtml(employeeName)}</strong>,</p>

    <p>Você foi cadastrado como funcionário na <strong>${this.escapeHtml(tenantName)}</strong>.</p>

    <p>Para acessar, crie sua conta no app usando <strong>exatamente este email</strong>:</p>

    <center>
      <code>${this.escapeHtml(to)}</code>
    </center>

    <center>
      <a href="${this.escapeHtml(signupUrl)}" class="button">Criar minha conta</a>
    </center>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Se o botão não funcionar, abra este link:<br>
      <code>${this.escapeHtml(signupUrl)}</code>
    </p>

    <p style="color: #666; margin-top: 30px;">
      Assim que você criar a conta com esse email, seu acesso é vinculado
      automaticamente à barbearia.
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
    return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
  }
}
