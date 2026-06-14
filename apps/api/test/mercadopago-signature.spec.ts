import {
  buildMpSignature,
  verifyMpWebhookSignature,
} from '../src/payment/mercadopago-signature';

/**
 * Testes da verificação de assinatura do webhook MP (ADR-022 §4). Cripto
 * pura, roda offline. É a peça de segurança crítica (evita markPaid forjado).
 */
const SECRET = 'whsec_test_123';
const DATA_ID = '111122223333';
const REQ_ID = 'req-abc';
const TS = '1700000000';

describe('verifyMpWebhookSignature', () => {
  it('aceita assinatura válida', () => {
    const xSignature = buildMpSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, ts: TS });
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, xSignature }),
    ).toBe(true);
  });

  it('rejeita se o secret for outro', () => {
    const xSignature = buildMpSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, ts: TS });
    expect(
      verifyMpWebhookSignature({ secret: 'errado', dataId: DATA_ID, xRequestId: REQ_ID, xSignature }),
    ).toBe(false);
  });

  it('rejeita se o data.id for adulterado', () => {
    const xSignature = buildMpSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, ts: TS });
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: '999', xRequestId: REQ_ID, xSignature }),
    ).toBe(false);
  });

  it('rejeita se o request-id mudar', () => {
    const xSignature = buildMpSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, ts: TS });
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: 'outro', xSignature }),
    ).toBe(false);
  });

  it('rejeita header ausente ou malformado', () => {
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, xSignature: undefined }),
    ).toBe(false);
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, xSignature: 'lixo' }),
    ).toBe(false);
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, xSignature: 'ts=1,v1=' }),
    ).toBe(false);
  });

  it('ordem dos campos no header não importa', () => {
    const valid = buildMpSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, ts: TS });
    const v1 = valid.split(',').find((p) => p.startsWith('v1='))!.slice(3);
    const reordered = `v1=${v1},ts=${TS}`;
    expect(
      verifyMpWebhookSignature({ secret: SECRET, dataId: DATA_ID, xRequestId: REQ_ID, xSignature: reordered }),
    ).toBe(true);
  });
});
