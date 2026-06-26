import { decodeEmailVerifyToken, encodeEmailVerifyToken } from '../src/common/email-verify-token';

const SECRET = 'test-secret';

describe('email-verify-token', () => {
  it('round-trip: decodifica o que codificou', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = encodeEmailVerifyToken({ userId: 'u1', exp }, SECRET);
    const r = decodeEmailVerifyToken(token, SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.userId).toBe('u1');
  });

  it('rejeita assinatura adulterada', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = encodeEmailVerifyToken({ userId: 'u1', exp }, SECRET);
    const r = decodeEmailVerifyToken(token, 'outro-secret');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid_signature');
  });

  it('rejeita expirado', () => {
    const token = encodeEmailVerifyToken({ userId: 'u1', exp: 1 }, SECRET);
    const r = decodeEmailVerifyToken(token, SECRET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('expired');
  });

  it('rejeita malformado', () => {
    expect(decodeEmailVerifyToken('semponto', SECRET).ok).toBe(false);
  });
});
