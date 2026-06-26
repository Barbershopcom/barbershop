import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de verificação de email = HMAC-SHA256 sobre `{userId, exp}` em JSON,
 * base64url: `<payloadB64>.<sigB64>`. Mesmo mecanismo do cancel-token
 * (sem lib, verificação constante, URL curta pra email).
 */

export interface EmailVerifyPayload {
  userId: string;
  exp: number; // unix seconds
}

export type DecodeResult =
  | { ok: true; payload: EmailVerifyPayload }
  | { ok: false; code: 'malformed' | 'invalid_signature' | 'expired' | 'invalid_payload' };

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeEmailVerifyToken(payload: EmailVerifyPayload, secret: string): string {
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

export function decodeEmailVerifyToken(token: string, secret: string): DecodeResult {
  const dot = token.indexOf('.');
  if (dot === -1) return { ok: false, code: 'malformed' };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expectedSig = base64UrlEncode(createHmac('sha256', secret).update(payloadB64).digest());
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, code: 'invalid_signature' };
  }

  let payload: EmailVerifyPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as EmailVerifyPayload;
  } catch {
    return { ok: false, code: 'invalid_payload' };
  }
  if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (Date.now() / 1000 > payload.exp) return { ok: false, code: 'expired' };
  return { ok: true, payload };
}
