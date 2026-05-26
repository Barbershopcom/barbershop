import { decodeCancelToken, encodeCancelToken } from '../src/slots/cancel-token';

const SECRET = 'test-secret-at-least-16-chars';

describe('cancel-token HMAC', () => {
  it('round-trip: encode + decode = payload original', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = encodeCancelToken({ apptId: 'appt-123', exp }, SECRET);
    const result = decodeCancelToken(token, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual({ apptId: 'appt-123', exp });
    }
  });

  it('rejeita assinatura inválida', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = encodeCancelToken({ apptId: 'appt-123', exp }, SECRET);
    const tampered = token.slice(0, -2) + 'AA';
    const result = decodeCancelToken(tampered, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_signature');
  });

  it('rejeita secret diferente', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = encodeCancelToken({ apptId: 'appt-123', exp }, SECRET);
    const result = decodeCancelToken(token, 'other-secret-also-16-chars');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_signature');
  });

  it('rejeita token expirado', () => {
    const exp = Math.floor(Date.now() / 1000) - 60; // 1 min atrás
    const token = encodeCancelToken({ apptId: 'appt-123', exp }, SECRET);
    const result = decodeCancelToken(token, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('expired');
  });

  it('rejeita token malformado (sem ponto)', () => {
    const result = decodeCancelToken('semponto', SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejeita payload sem apptId', () => {
    // Forja payload válido em base64 mas sem apptId
    const fakePayload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    // Assinatura correta pra esse payload (pra passar do check de signature)
    const { createHmac } = require('node:crypto');
    const sig = createHmac('sha256', SECRET).update(fakePayload).digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const result = decodeCancelToken(`${fakePayload}.${sig}`, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_payload');
  });
});
