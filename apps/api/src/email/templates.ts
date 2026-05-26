/**
 * Templates de email — HTML strings simples (ADR-006 §3).
 *
 * Princípio: tudo inline-style pra cross-client (Gmail strip <style>),
 * sem JS, sem media queries (sem ROI cross-client). Layout mobile-friendly
 * via max-width + table-based centering.
 */

export interface BookingTemplateVars {
  /** Nome da barbearia (tenant.name) */
  tenantName: string;
  /** Nome do cliente */
  customerName: string;
  /** Data formatada PT-BR (ex: "quinta-feira, 28 de maio") */
  dateLabel: string;
  /** Hora formatada (ex: "14:00") */
  timeLabel: string;
  /** Duração formatada (ex: "30 minutos") */
  durationLabel: string;
  /** Nome do serviço */
  serviceName: string;
  /** Nome do barbeiro */
  barberName: string;
  /** URL completa do cancel link. Undefined em template de "cancelled" */
  cancelUrl?: string;
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #ffffff;
  line-height: 1.5;
`.replace(/\s+/g, ' ').trim();

const BOX_STYLE = `
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 24px 0;
`.replace(/\s+/g, ' ').trim();

const BUTTON_STYLE = `
  display: inline-block;
  background: #357BE4;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 16px;
`.replace(/\s+/g, ' ').trim();

export function bookingConfirmationTemplate(v: BookingTemplateVars): string {
  const cancelBlock = v.cancelUrl
    ? `
      <p style="margin-top: 24px; font-size: 14px; color: #4a4a4a;">
        Precisa cancelar? Use este link a qualquer momento até o horário do agendamento:
      </p>
      <a href="${escapeHtml(v.cancelUrl)}" style="${BUTTON_STYLE}">Cancelar agendamento</a>
      <p style="margin-top: 12px; font-size: 12px; color: #727B8E;">
        Se você não fez esse agendamento, pode ignorar este email.
      </p>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Agendamento confirmado</title>
</head>
<body style="margin: 0; background: #f0f2f5;">
  <div style="${BASE_STYLE}">
    <h1 style="font-size: 22px; margin: 0 0 8px;">Agendamento confirmado</h1>
    <p style="color: #4a4a4a; margin: 0;">Olá, ${escapeHtml(v.customerName)}!</p>

    <div style="${BOX_STYLE}">
      <p style="margin: 0 0 8px; font-weight: 600;">${escapeHtml(v.tenantName)}</p>
      <p style="margin: 0; color: #4a4a4a;">
        ${escapeHtml(v.dateLabel)} às <strong>${escapeHtml(v.timeLabel)}</strong>
        (${escapeHtml(v.durationLabel)})
      </p>
      <p style="margin: 8px 0 0; color: #4a4a4a;">
        ${escapeHtml(v.serviceName)} com ${escapeHtml(v.barberName)}
      </p>
    </div>

    ${cancelBlock}
  </div>
</body>
</html>`;
}

export function bookingReminderTemplate(v: BookingTemplateVars): string {
  const cancelBlock = v.cancelUrl
    ? `
      <p style="margin-top: 24px; font-size: 14px; color: #4a4a4a;">
        Não vai conseguir comparecer? Avise pela barbearia ou cancele aqui:
      </p>
      <a href="${escapeHtml(v.cancelUrl)}" style="${BUTTON_STYLE}">Cancelar agendamento</a>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lembrete: agendamento amanhã</title>
</head>
<body style="margin: 0; background: #f0f2f5;">
  <div style="${BASE_STYLE}">
    <h1 style="font-size: 22px; margin: 0 0 8px;">Seu agendamento é amanhã</h1>
    <p style="color: #4a4a4a; margin: 0;">Olá, ${escapeHtml(v.customerName)}!</p>

    <div style="${BOX_STYLE}">
      <p style="margin: 0 0 8px; font-weight: 600;">${escapeHtml(v.tenantName)}</p>
      <p style="margin: 0; color: #4a4a4a;">
        ${escapeHtml(v.dateLabel)} às <strong>${escapeHtml(v.timeLabel)}</strong>
        (${escapeHtml(v.durationLabel)})
      </p>
      <p style="margin: 8px 0 0; color: #4a4a4a;">
        ${escapeHtml(v.serviceName)} com ${escapeHtml(v.barberName)}
      </p>
    </div>

    ${cancelBlock}
  </div>
</body>
</html>`;
}

export function bookingCancelledTemplate(v: BookingTemplateVars): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Agendamento cancelado</title>
</head>
<body style="margin: 0; background: #f0f2f5;">
  <div style="${BASE_STYLE}">
    <h1 style="font-size: 22px; margin: 0 0 8px;">Agendamento cancelado</h1>
    <p style="color: #4a4a4a; margin: 0;">Olá, ${escapeHtml(v.customerName)}.</p>

    <div style="${BOX_STYLE}">
      <p style="margin: 0 0 8px; font-weight: 600;">${escapeHtml(v.tenantName)}</p>
      <p style="margin: 0; color: #4a4a4a;">
        ${escapeHtml(v.dateLabel)} às <strong>${escapeHtml(v.timeLabel)}</strong> — cancelado.
      </p>
    </div>

    <p style="color: #4a4a4a; font-size: 14px;">
      Pra remarcar, entre em contato com a barbearia ou acesse o site.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
