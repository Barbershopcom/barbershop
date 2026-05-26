import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de cancel = HMAC-SHA256 sobre `{apptId, exp}` em UTF-8 JSON,
 * codificado em base64url:
 *
 *   token = <payloadB64>.<sigB64>
 *
 * Por que HMAC e não JWT:
 *  - Não precisa de claim padronizado nem header (alg, kid)
 *  - Verificação é só uma comparação constante
 *  - Sem dependência de lib
 *  - Tamanho menor → URL fica curta o suficiente pra emails
 *
 * TTL: `exp` é o `appointment.startAt` (link inválido depois disso).
 */

export interface CancelTokenPayload {
  apptId: string;
  exp: number; // unix seconds
}

export function encodeCancelToken(payload: CancelTokenPayload, secret: string): string {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(Buffer.from(payloadJson, 'utf8'));
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export interface DecodeResult {
  ok: true;
  payload: CancelTokenPayload;
}
export interface DecodeError {
  ok: false;
  code: 'malformed' | 'invalid_signature' | 'expired' | 'invalid_payload';
}

export function decodeCancelToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): DecodeResult | DecodeError {
  const dot = token.indexOf('.');
  if (dot === -1) return { ok: false, code: 'malformed' };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  if (!payloadB64 || !sigB64) return { ok: false, code: 'malformed' };

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, code: 'malformed' };
  }
  if (providedSig.length !== expectedSig.length) {
    return { ok: false, code: 'invalid_signature' };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, code: 'invalid_signature' };
  }

  let payload: CancelTokenPayload;
  try {
    const payloadJson = base64UrlDecode(payloadB64).toString('utf8');
    const parsed = JSON.parse(payloadJson) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { apptId?: unknown }).apptId !== 'string' ||
      typeof (parsed as { exp?: unknown }).exp !== 'number'
    ) {
      return { ok: false, code: 'invalid_payload' };
    }
    payload = parsed as CancelTokenPayload;
  } catch {
    return { ok: false, code: 'invalid_payload' };
  }

  const nowSec = Math.floor(now.getTime() / 1000);
  if (payload.exp < nowSec) return { ok: false, code: 'expired' };

  return { ok: true, payload };
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Buffer {
  // Restaura padding
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(std, 'base64');
}
