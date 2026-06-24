import { z } from 'zod';

import type { AppointmentStatus } from './appointments';

/**
 * Domínio de pagamento (ADR-016 §5).
 *
 * Divergência #3 do council resolvida: CLIENTE paga a taxa do método,
 * com Pix em destaque (taxa ~zero). As taxas abaixo são as do mock e
 * espelham a ordem de grandeza do Mercado Pago BR — quando o PSP real
 * entrar (S21), os números reais virão da config do gateway, mas a
 * MECÂNICA (cliente paga, calculada server-side) já fica pronta aqui.
 */

export const paymentMethods = ['pix', 'credit', 'debit', 'wallet'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodSchema = z.enum(paymentMethods);

export const paymentStatuses = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'expired',
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

/** Status que OCUPAM o slot do barbeiro (espelha a EXCLUDE constraint). */
export const slotOccupyingStatuses: readonly AppointmentStatus[] = [
  'awaiting_payment',
  'pending',
  'confirmed',
];

/**
 * Configuração de taxa por método de pagamento.
 * `pctBps` = pontos-base (1% = 100 bps). `fixedCents` = parcela fixa.
 *
 * Mock: aproxima Mercado Pago BR. Pix de graça (incentiva o método mais
 * barato pra plataforma), débito barato, crédito mais caro.
 */
export interface MethodFeeConfig {
  pctBps: number;
  fixedCents: number;
}

export const MOCK_METHOD_FEES: Record<PaymentMethod, MethodFeeConfig> = {
  pix: { pctBps: 0, fixedCents: 0 },
  debit: { pctBps: 200, fixedCents: 0 }, // ~2%
  credit: { pctBps: 499, fixedCents: 0 }, // ~4.99%
  wallet: { pctBps: 0, fixedCents: 0 }, // saldo: sem taxa (incentivo) — fase futura
};

/**
 * Comissão da plataforma sobre o valor do serviço (ADR-015; revisado pra 15%
 * no handoff NAVALHA — "VOCÊ RECEBE" do barbeiro = líquido após 15%).
 */
export const PLATFORM_COMMISSION_BPS = 1500; // 15%

export interface PriceBreakdown {
  /** Preço base do(s) serviço(s) em centavos. */
  serviceCents: number;
  /** Taxa do método paga pelo cliente. */
  feeCents: number;
  /** Total cobrado do cliente (serviceCents + feeCents). */
  amountCents: number;
  /** Comissão da plataforma (calculada sobre o serviço; cobrada via split no futuro). */
  platformFeeCents: number;
  method: PaymentMethod;
}

/**
 * Calcula o breakdown de preço pra um método. Função PURA — totalmente
 * testável sem DB/rede. Núcleo da divergência #3.
 *
 * Arredondamento: fee arredonda pra cima (Math.ceil) pra nunca a
 * plataforma/PSP sair no prejuízo por causa de centavo.
 */
export function computePriceBreakdown(
  serviceCents: number,
  method: PaymentMethod,
  fees: Record<PaymentMethod, MethodFeeConfig> = MOCK_METHOD_FEES,
): PriceBreakdown {
  if (!Number.isInteger(serviceCents) || serviceCents < 0) {
    throw new Error(`serviceCents inválido: ${serviceCents}`);
  }
  const cfg = fees[method];
  const feeCents = Math.ceil((serviceCents * cfg.pctBps) / 10_000) + cfg.fixedCents;
  const platformFeeCents = Math.ceil((serviceCents * PLATFORM_COMMISSION_BPS) / 10_000);
  return {
    serviceCents,
    feeCents,
    amountCents: serviceCents + feeCents,
    platformFeeCents,
    method,
  };
}

/** Retorna o breakdown de todos os métodos — pra UI montar o seletor. */
export function computeAllMethodBreakdowns(
  serviceCents: number,
  fees: Record<PaymentMethod, MethodFeeConfig> = MOCK_METHOD_FEES,
): Record<PaymentMethod, PriceBreakdown> {
  return paymentMethods.reduce(
    (acc, m) => {
      acc[m] = computePriceBreakdown(serviceCents, m, fees);
      return acc;
    },
    {} as Record<PaymentMethod, PriceBreakdown>,
  );
}

/** Input do POST de confirmação de pagamento (mock). */
export const confirmPaymentSchema = z.object({
  method: paymentMethodSchema,
  possessionToken: z.string().min(1),
});
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

/** DTO de pagamento retornado ao cliente. */
export interface PaymentDto {
  id: string;
  appointmentId: string;
  provider: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  feeCents: number;
  paidAt: string | null;
}
