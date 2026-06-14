import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica a assinatura `x-signature` do webhook do Mercado Pago (ADR-022 §4).
 * Pura e testável — recebe o secret explícito (a decisão de fail-open em dev
 * fica no controller, que depende de NODE_ENV).
 *
 * Header: `x-signature: ts=<unix>,v1=<hmac-hex>`.
 * Manifesto assinado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 */
export function verifyMpWebhookSignature(args: {
  secret: string;
  dataId: string;
  xRequestId: string | undefined;
  xSignature: string | undefined;
}): boolean {
  const { secret, dataId, xRequestId, xSignature } = args;
  if (!xSignature) return false;

  const parts: Record<string, string> = {};
  for (const kv of xSignature.split(',')) {
    const idx = kv.indexOf('=');
    if (idx === -1) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

/** Gera o header x-signature válido pra um manifesto — usado em testes. */
export function buildMpSignature(args: {
  secret: string;
  dataId: string;
  xRequestId: string | undefined;
  ts: string;
}): string {
  const manifest = `id:${args.dataId};request-id:${args.xRequestId ?? ''};ts:${args.ts};`;
  const v1 = createHmac('sha256', args.secret).update(manifest).digest('hex');
  return `ts=${args.ts},v1=${v1}`;
}
