// apps/api/test/mercadopago-preapproval.spec.ts
import { ConfigService } from '@nestjs/config';
import { MercadoPagoProvider } from '../src/payment/mercadopago.provider';

function providerWithToken(): MercadoPagoProvider {
  const config = {
    get: (k: string) =>
      ({ MERCADOPAGO_BASE_URL: 'https://api.mp', MERCADOPAGO_ACCESS_TOKEN: 'APP_USR_x' } as Record<string, string>)[k],
  } as unknown as ConfigService;
  return new MercadoPagoProvider(config);
}

describe('MercadoPagoProvider.createPreapproval', () => {
  afterEach(() => jest.restoreAllMocks());

  it('POSTa /preapproval com free_trial e devolve id/status', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'pre_1', status: 'authorized' }), { status: 201 }),
    );
    const p = providerWithToken();
    const r = await p.createPreapproval({
      reason: 'Assinatura', externalReference: 'tenant-1', payerEmail: 'd@x.com',
      cardTokenId: 'tok_1', amountCents: 9990, frequency: 1, frequencyType: 'months',
      trialDays: 14, backUrl: 'https://app/x',
    });
    expect(r).toEqual({ id: 'pre_1', status: 'authorized' });
    const call = fetchMock.mock.calls[0] as [string | URL | Request, RequestInit | undefined];
    const [, init] = call;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.auto_recurring.transaction_amount).toBe(99.9);
    expect(body.auto_recurring.currency_id).toBe('BRL');
    expect(body.auto_recurring.free_trial).toEqual({ frequency: 14, frequency_type: 'days' });
    expect(body.external_reference).toBe('tenant-1');
    // A cobrança da assinatura SEMPRE usa o token da plataforma (nunca o do vendedor).
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer APP_USR_x');
  });

  it('lança quando o MP recusa', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid card_token' }), { status: 400 }),
    );
    await expect(
      providerWithToken().createPreapproval({
        reason: 'x', externalReference: 't', payerEmail: 'd@x.com', cardTokenId: 'bad',
        amountCents: 9990, frequency: 1, frequencyType: 'months', trialDays: 14, backUrl: 'b',
      }),
    ).rejects.toThrow();
  });
});
