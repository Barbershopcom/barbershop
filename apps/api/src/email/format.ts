/**
 * Helpers de formatação compartilhados pelos callsites de email.
 */

export function formatPriceBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Constrói deep-link wa.me com mensagem pré-preenchida em pt-BR (ADR-012 §2).
 */
export function buildWhatsAppUrl(
  phoneE164: string,
  tenantName: string,
): string {
  const digits = phoneE164.replace(/^\+/, '');
  const text = encodeURIComponent(
    `Olá, ${tenantName}! Vim pelo email e gostaria de falar com vocês.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Helper pra spread nos vars do email — pega os 3 fields opcionais do
 * tenant e devolve o shape que `BookingTemplateVars` espera.
 */
export function tenantContactVars(tenant: {
  name: string;
  phoneE164?: string | null;
  addressLine?: string | null;
  instagramHandle?: string | null;
}): {
  addressLine: string | null;
  instagramHandle: string | null;
  whatsappUrl: string | null;
} {
  return {
    addressLine: tenant.addressLine ?? null,
    instagramHandle: tenant.instagramHandle ?? null,
    whatsappUrl: tenant.phoneE164
      ? buildWhatsAppUrl(tenant.phoneE164, tenant.name)
      : null,
  };
}
