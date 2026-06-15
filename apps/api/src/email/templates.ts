/**
 * Templates de email vintage barber — HTML strings.
 *
 * Princípio: inline-style + table-based pra cross-client. Gmail/Outlook/
 * Apple Mail. Sem animações (clients ignoram). Bebas Neue + Lora via
 * Google Fonts com fallback Impact/Georgia.
 *
 * Os 4 templates compartilham `vintageEmailShell()` e variam apenas em:
 * - hero (saudação + subtítulo)
 * - badge no card (CONFIRMADO / LEMBRETE / REMARCADO / CANCELADO)
 * - corpo do card (datas + grid de detalhes)
 * - CTA (cancel button, ou nenhum)
 * - mensagem na faixa escura
 */

export interface BookingTemplateVars {
  /** Nome da barbearia (tenant.name) */
  tenantName: string;
  /** Nome do cliente */
  customerName: string;
  /** Data formatada PT-BR (ex: "Sexta, 30 de Maio") */
  dateLabel: string;
  /** Hora formatada (ex: "14:30") */
  timeLabel: string;
  /** Duração formatada (ex: "30 minutos") */
  durationLabel: string;
  /** Nome do serviço */
  serviceName: string;
  /** Nome do barbeiro */
  barberName: string;
  /** Preço formatado (ex: "R$ 60,00"). Opcional — se ausente, célula é omitida. */
  priceLabel?: string;
  /** URL completa do cancel link. Undefined em template de "cancelled" */
  cancelUrl?: string;
  /** Endereço da barbearia, se setado (ADR-012). */
  addressLine?: string | null;
  /** Instagram handle (sem @), se setado (ADR-012). */
  instagramHandle?: string | null;
  /** URL pronta do WhatsApp (wa.me/...). Construir com `buildWhatsAppUrl`. */
  whatsappUrl?: string | null;
}

export interface RescheduleTemplateVars extends BookingTemplateVars {
  /** Data antiga formatada PT-BR */
  previousDateLabel: string;
  /** Hora antiga formatada */
  previousTimeLabel: string;
}

const COLOR_PAPER = '#fffcf5';
const COLOR_INK = '#1c1917';
const COLOR_NAVY = '#1a365d';
const COLOR_RED = '#bf212f';
const COLOR_GOLD = '#c5a059';
const COLOR_DIM = 'rgba(28,25,23,0.7)';
const COLOR_MUTED = 'rgba(0,0,0,0.4)';
const COLOR_HAIRLINE = 'rgba(0,0,0,0.1)';

const FONT_DISPLAY = "'Bebas Neue', Impact, 'Arial Black', sans-serif";
const FONT_BODY = "'Lora', Georgia, 'Times New Roman', serif";

const STRIPE_GRADIENT =
  'background:repeating-linear-gradient(45deg,#bf212f,#bf212f 10px,#fffcf5 10px,#fffcf5 20px,#1a365d 20px,#1a365d 30px,#fffcf5 30px,#fffcf5 40px);';

export function bookingConfirmationTemplate(v: BookingTemplateVars): string {
  return vintageEmailShell({
    tenantName: v.tenantName,
    preheader: `Sua reserva em ${v.tenantName} está confirmada para ${v.dateLabel} às ${v.timeLabel}.`,
    hero: heroBlock({
      headline: `Tudo certo, ${escapeHtml(v.customerName)}! <span style="color:${COLOR_RED};">&#9986;</span>`,
      subtitle:
        'Sua cadeira está reservada. Prepare-se para o toque firme da nossa navalha quente sobre o couro.',
    }),
    card: appointmentCard({
      badge: 'CONFIRMADO',
      badgeColor: COLOR_RED,
      rows: standardCardRows(v),
    }),
    contact: contactBlock(v),
    cta: v.cancelUrl ? cancelButton(v.cancelUrl) : undefined,
    policies: policiesBlock({
      primary: 'Cancele com até 2h de antecedência sem custos adicionais.',
      accent: 'Enviaremos um lembrete 24h antes do seu atendimento.',
    }),
  });
}

export function paymentReceivedTemplate(v: BookingTemplateVars): string {
  return vintageEmailShell({
    tenantName: v.tenantName,
    preheader: `Recebemos seu pagamento. ${v.tenantName} vai confirmar seu horário em breve.`,
    hero: heroBlock({
      headline: `Pagamento recebido, ${escapeHtml(v.customerName)}! <span style="color:${COLOR_RED};">&#9986;</span>`,
      subtitle:
        'Tudo certo com o pagamento. Agora é só aguardar a barbearia confirmar o seu horário — avisamos por aqui assim que isso acontecer.',
    }),
    card: appointmentCard({
      badge: 'AGUARDANDO CONFIRMAÇÃO',
      badgeColor: COLOR_GOLD,
      rows: standardCardRows(v),
    }),
    contact: contactBlock(v),
    cta: v.cancelUrl ? cancelButton(v.cancelUrl) : undefined,
    policies: policiesBlock({
      primary: 'Você receberá a confirmação assim que a barbearia aceitar o horário.',
      accent: 'Se precisar, cancele com até 2h de antecedência.',
    }),
  });
}

export function bookingReminderTemplate(v: BookingTemplateVars): string {
  return vintageEmailShell({
    tenantName: v.tenantName,
    preheader: `Lembrete: seu corte em ${v.tenantName} é amanhã, ${v.dateLabel} às ${v.timeLabel}.`,
    hero: heroBlock({
      headline: `Seu corte é amanhã, ${escapeHtml(v.customerName)}.`,
      subtitle:
        'A cadeira já está sendo preparada. Confirme sua presença e venha de barba feita ou sem.',
    }),
    card: appointmentCard({
      badge: 'LEMBRETE',
      badgeColor: COLOR_GOLD,
      rows: standardCardRows(v),
    }),
    contact: contactBlock(v),
    cta: v.cancelUrl ? cancelButton(v.cancelUrl) : undefined,
    policies: policiesBlock({
      primary: 'Se algo mudou, cancele com pelo menos 2h de antecedência.',
      accent: 'Te esperamos amanhã na cadeira.',
    }),
  });
}

export function bookingRescheduledTemplate(v: RescheduleTemplateVars): string {
  return vintageEmailShell({
    tenantName: v.tenantName,
    preheader: `Novo horário: ${v.dateLabel} às ${v.timeLabel} em ${v.tenantName}.`,
    hero: heroBlock({
      headline: `Novo dia confirmado, ${escapeHtml(v.customerName)}.`,
      subtitle: 'Anote no relógio: a navalha te espera em outra hora.',
    }),
    card: appointmentCard({
      badge: 'REMARCADO',
      badgeColor: COLOR_RED,
      rows: rescheduledCardRows(v),
    }),
    contact: contactBlock(v),
    cta: v.cancelUrl ? cancelButton(v.cancelUrl) : undefined,
    policies: policiesBlock({
      primary: 'Cancele com até 2h de antecedência sem custos adicionais.',
      accent: 'O lembrete será disparado 24h antes do novo horário.',
    }),
  });
}

export function bookingCancelledTemplate(v: BookingTemplateVars): string {
  return vintageEmailShell({
    tenantName: v.tenantName,
    preheader: `Seu agendamento em ${v.tenantName} foi cancelado.`,
    hero: heroBlock({
      headline: `Até a próxima, ${escapeHtml(v.customerName)}.`,
      subtitle:
        'Seu agendamento foi cancelado. A cadeira segue aqui quando você quiser voltar.',
    }),
    card: appointmentCard({
      badge: 'CANCELADO',
      badgeColor: COLOR_MUTED,
      rows: cancelledCardRows(v),
    }),
    contact: contactBlock(v),
    policies: policiesBlock({
      primary: 'Pra remarcar, é só voltar ao link da barbearia.',
      accent: 'Estamos sempre afiados.',
    }),
  });
}

// ============================================================================
// Building blocks
// ============================================================================

function vintageEmailShell(args: {
  tenantName: string;
  preheader: string;
  hero: string;
  card: string;
  contact?: string;
  cta?: string;
  policies?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(args.tenantName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lora:ital,wght@0,400;0,700;1,400&display=swap">
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:${FONT_BODY};color:${COLOR_INK};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(args.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f2f2;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${COLOR_PAPER};border:1px solid ${COLOR_HAIRLINE};">
      <tr><td style="height:12px;${STRIPE_GRADIENT}line-height:0;font-size:0;">&nbsp;</td></tr>
      ${logoBlock(args.tenantName)}
      ${args.hero}
      <tr><td style="padding:0 32px 40px;">
        ${args.card}
        ${args.cta ?? ''}
      </td></tr>
      ${args.contact ?? ''}
      ${args.policies ?? ''}
      ${footerBlock(args.tenantName)}
      <tr><td style="height:4px;opacity:0.5;${STRIPE_GRADIENT}line-height:0;font-size:0;">&nbsp;</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function logoBlock(tenantName: string): string {
  return `<tr><td align="center" style="padding:40px 32px 24px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:2px solid ${COLOR_NAVY};">
      <tr><td style="padding:4px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${COLOR_NAVY};">
          <tr><td style="padding:16px 28px;text-align:center;">
            <div style="font-family:${FONT_DISPLAY};font-size:32px;letter-spacing:0.15em;color:${COLOR_NAVY};line-height:1;">
              ${escapeHtml(tenantName.toUpperCase())}
            </div>
            <div style="font-size:10px;letter-spacing:0.3em;font-weight:700;margin-top:8px;text-transform:uppercase;color:${COLOR_INK};">
              Corte &amp; Navalha
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function heroBlock(args: { headline: string; subtitle: string }): string {
  return `<tr><td align="center" style="padding:16px 32px 32px;">
    <h2 style="margin:0;font-size:28px;font-style:italic;font-weight:700;color:${COLOR_INK};line-height:1.2;">
      ${args.headline}
    </h2>
    <p style="margin:12px auto 0;max-width:42ch;font-size:14px;font-style:italic;color:${COLOR_DIM};line-height:1.5;">
      ${escapeHtml(args.subtitle)}
    </p>
  </td></tr>`;
}

function appointmentCard(args: {
  badge: string;
  badgeColor: string;
  rows: string;
}): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:2px solid ${COLOR_INK};">
    <tr><td style="padding:4px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${COLOR_INK};">
        <tr><td align="center" style="padding:0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="padding:0 16px;background:${COLOR_PAPER};font-family:${FONT_DISPLAY};font-size:20px;letter-spacing:0.05em;color:${args.badgeColor};line-height:1;transform:translateY(-12px);">
              ${escapeHtml(args.badge)}
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          ${args.rows}
        </td></tr>
      </table>
    </td></tr>
  </table>`;
}

function standardCardRows(v: BookingTemplateVars): string {
  const left1 = detailCell({
    label: 'Data &amp; Horário',
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;">${escapeHtml(v.dateLabel)}</div>
           <div style="font-size:18px;font-weight:700;color:${COLOR_NAVY};">${escapeHtml(v.timeLabel)}</div>`,
  });
  const right1 = detailCell({
    label: 'Profissional',
    bordered: true,
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;border-bottom:2px solid ${COLOR_GOLD};display:inline-block;padding-bottom:2px;">${escapeHtml(v.barberName)}</div>`,
  });
  const left2 = detailCell({
    label: 'Serviço',
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;">${escapeHtml(v.serviceName)}</div>
           <div style="font-size:12px;color:${COLOR_DIM};margin-top:2px;font-style:italic;">${escapeHtml(v.durationLabel)}</div>`,
  });
  const right2 = v.priceLabel
    ? detailCell({
        label: 'Investimento',
        bordered: true,
        html: `<div style="font-size:18px;font-weight:700;margin-top:4px;letter-spacing:-0.02em;">${escapeHtml(v.priceLabel)}</div>`,
      })
    : `<td width="50%" valign="top" style="padding-left:24px;border-left:1px solid ${COLOR_HAIRLINE};"></td>`;

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>${left1}${right1}</tr>
    <tr><td colspan="2" style="height:32px;line-height:0;font-size:0;">&nbsp;</td></tr>
    <tr>${left2}${right2}</tr>
  </table>`;
}

function rescheduledCardRows(v: RescheduleTemplateVars): string {
  const oldNew = `<tr><td colspan="2" valign="top" style="padding-bottom:24px;">
    <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.15em;color:${COLOR_MUTED};">
      Era
    </div>
    <div style="font-size:16px;font-weight:400;margin-top:4px;color:${COLOR_DIM};text-decoration:line-through;">
      ${escapeHtml(v.previousDateLabel)} &middot; ${escapeHtml(v.previousTimeLabel)}
    </div>
    <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.15em;color:${COLOR_MUTED};margin-top:16px;">
      Agora
    </div>
    <div style="font-size:20px;font-weight:700;margin-top:4px;">
      ${escapeHtml(v.dateLabel)} &middot; <span style="color:${COLOR_NAVY};">${escapeHtml(v.timeLabel)}</span>
    </div>
  </td></tr>`;

  const left = detailCell({
    label: 'Serviço',
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;">${escapeHtml(v.serviceName)}</div>
           <div style="font-size:12px;color:${COLOR_DIM};margin-top:2px;font-style:italic;">com ${escapeHtml(v.barberName)}</div>`,
  });
  const right = v.priceLabel
    ? detailCell({
        label: 'Investimento',
        bordered: true,
        html: `<div style="font-size:18px;font-weight:700;margin-top:4px;letter-spacing:-0.02em;">${escapeHtml(v.priceLabel)}</div>`,
      })
    : `<td width="50%" valign="top" style="padding-left:24px;border-left:1px solid ${COLOR_HAIRLINE};"></td>`;

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    ${oldNew}
    <tr>${left}${right}</tr>
  </table>`;
}

function cancelledCardRows(v: BookingTemplateVars): string {
  const left1 = detailCell({
    label: 'Data &amp; Horário',
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;color:${COLOR_DIM};text-decoration:line-through;">${escapeHtml(v.dateLabel)}</div>
           <div style="font-size:18px;font-weight:700;color:${COLOR_DIM};text-decoration:line-through;">${escapeHtml(v.timeLabel)}</div>`,
  });
  const right1 = detailCell({
    label: 'Profissional',
    bordered: true,
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;color:${COLOR_DIM};">${escapeHtml(v.barberName)}</div>`,
  });
  const left2 = detailCell({
    label: 'Serviço',
    html: `<div style="font-size:18px;font-weight:700;margin-top:4px;color:${COLOR_DIM};">${escapeHtml(v.serviceName)}</div>`,
  });
  const right2 = `<td width="50%" valign="top" style="padding-left:24px;border-left:1px solid ${COLOR_HAIRLINE};"></td>`;

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>${left1}${right1}</tr>
    <tr><td colspan="2" style="height:32px;line-height:0;font-size:0;">&nbsp;</td></tr>
    <tr>${left2}${right2}</tr>
  </table>`;
}

function detailCell(args: {
  label: string;
  html: string;
  bordered?: boolean;
}): string {
  const tdStyle = args.bordered
    ? `padding-left:24px;border-left:1px solid ${COLOR_HAIRLINE};`
    : '';
  return `<td width="50%" valign="top" style="${tdStyle}">
    <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.15em;color:${COLOR_MUTED};">
      ${args.label}
    </div>
    ${args.html}
  </td>`;
}

function cancelButton(cancelUrl: string): string {
  return `<div style="margin-top:32px;text-align:center;">
    <a href="${escapeHtml(cancelUrl)}" style="display:inline-block;border:2px solid ${COLOR_INK};color:${COLOR_INK};padding:14px 36px;font-family:${FONT_DISPLAY};font-size:18px;letter-spacing:0.2em;text-decoration:none;background:${COLOR_PAPER};">
      CANCELAR
    </a>
  </div>`;
}

/**
 * Block opcional com contato da barbearia (endereço, Instagram, WhatsApp).
 * Só renderiza se ao menos 1 field estiver setado. ADR-012 §9.
 */
function contactBlock(v: BookingTemplateVars): string | undefined {
  const items: string[] = [];

  if (v.addressLine) {
    items.push(`<tr><td style="padding:4px 0;font-size:13px;color:${COLOR_DIM};">
      📍 ${escapeHtml(v.addressLine)}
    </td></tr>`);
  }

  if (v.instagramHandle) {
    items.push(`<tr><td style="padding:4px 0;font-size:13px;">
      <a href="https://instagram.com/${escapeHtml(v.instagramHandle)}" style="color:${COLOR_NAVY};text-decoration:none;">
        📷 @${escapeHtml(v.instagramHandle)}
      </a>
    </td></tr>`);
  }

  if (v.whatsappUrl) {
    items.push(`<tr><td style="padding:4px 0;font-size:13px;">
      <a href="${escapeHtml(v.whatsappUrl)}" style="color:${COLOR_NAVY};text-decoration:none;font-weight:700;">
        💬 Chamar no WhatsApp
      </a>
    </td></tr>`);
  }

  if (items.length === 0) return undefined;

  return `<tr><td align="center" style="padding:0 32px 24px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-family:${FONT_BODY};">
      ${items.join('\n')}
    </table>
  </td></tr>`;
}

function policiesBlock(args: { primary: string; accent: string }): string {
  return `<tr><td style="background:${COLOR_INK};color:rgba(255,252,245,0.8);padding:32px;text-align:center;font-family:${FONT_BODY};font-style:italic;font-size:13px;line-height:1.5;">
    <p style="margin:0 0 12px;">${escapeHtml(args.primary)}</p>
    <p style="margin:0;font-weight:700;color:${COLOR_GOLD};">${escapeHtml(args.accent)}</p>
  </td></tr>`;
}

function footerBlock(tenantName: string): string {
  const year = new Date().getFullYear();
  return `<tr><td style="padding:32px;text-align:center;">
    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:${COLOR_MUTED};">
      &copy; ${year} ${escapeHtml(tenantName)} &mdash; Vintage Grooming Specialists
    </p>
  </td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
