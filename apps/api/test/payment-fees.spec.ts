import {
  computeAllMethodBreakdowns,
  computePriceBreakdown,
  MOCK_METHOD_FEES,
  PLATFORM_COMMISSION_BPS,
} from '@barbearia/schemas';

/**
 * Testes da calculadora de taxa por método (ADR-016 §5).
 * Função pura — sem DB, roda offline. Núcleo da divergência #3 do council
 * (cliente paga a taxa do método, Pix em destaque com taxa zero).
 */
describe('computePriceBreakdown', () => {
  const SERVICE = 6000; // R$ 60,00

  it('pix: taxa zero — cliente paga só o serviço', () => {
    const b = computePriceBreakdown(SERVICE, 'pix');
    expect(b.feeCents).toBe(0);
    expect(b.amountCents).toBe(6000);
  });

  it('debit: ~2% sobre o serviço', () => {
    const b = computePriceBreakdown(SERVICE, 'debit');
    // 6000 * 200bps / 10000 = 120
    expect(b.feeCents).toBe(120);
    expect(b.amountCents).toBe(6120);
  });

  it('credit: ~4.99% sobre o serviço', () => {
    const b = computePriceBreakdown(SERVICE, 'credit');
    // ceil(6000 * 499 / 10000) = ceil(299.4) = 300
    expect(b.feeCents).toBe(300);
    expect(b.amountCents).toBe(6300);
  });

  it('wallet: taxa zero (incentivo de saldo)', () => {
    const b = computePriceBreakdown(SERVICE, 'wallet');
    expect(b.feeCents).toBe(0);
    expect(b.amountCents).toBe(6000);
  });

  it('platformFee é 5% do serviço, independente do método', () => {
    const expected = Math.ceil((SERVICE * PLATFORM_COMMISSION_BPS) / 10_000);
    for (const m of ['pix', 'debit', 'credit', 'wallet'] as const) {
      expect(computePriceBreakdown(SERVICE, m).platformFeeCents).toBe(expected);
    }
    expect(expected).toBe(300); // 5% de 6000
  });

  it('fee arredonda pra CIMA (nunca prejuízo de centavo)', () => {
    // 3333 * 499bps / 10000 = 166.3... → ceil = 167
    const b = computePriceBreakdown(3333, 'credit');
    expect(b.feeCents).toBe(167);
  });

  it('serviceCents 0 → tudo zero', () => {
    const b = computePriceBreakdown(0, 'credit');
    expect(b).toMatchObject({ feeCents: 0, amountCents: 0, platformFeeCents: 0 });
  });

  it('rejeita serviceCents negativo ou não-inteiro', () => {
    expect(() => computePriceBreakdown(-100, 'pix')).toThrow();
    expect(() => computePriceBreakdown(99.9, 'pix')).toThrow();
  });

  it('computeAllMethodBreakdowns retorna os 4 métodos', () => {
    const all = computeAllMethodBreakdowns(SERVICE);
    expect(Object.keys(all).sort()).toEqual(['credit', 'debit', 'pix', 'wallet']);
    expect(all.pix.amountCents).toBeLessThanOrEqual(all.credit.amountCents);
  });

  it('Pix é sempre o método mais barato (ou empatado) pro cliente', () => {
    const all = computeAllMethodBreakdowns(SERVICE);
    const pixTotal = all.pix.amountCents;
    for (const m of ['debit', 'credit'] as const) {
      expect(pixTotal).toBeLessThanOrEqual(all[m].amountCents);
    }
  });

  it('config de fees é injetável (pra trocar pelo PSP real no S21)', () => {
    const customFees = {
      ...MOCK_METHOD_FEES,
      pix: { pctBps: 99, fixedCents: 0 }, // PSP que cobra Pix
    };
    const b = computePriceBreakdown(10_000, 'pix', customFees);
    expect(b.feeCents).toBe(99);
  });
});
