import type { PaymentMethod } from '@barbearia/schemas';

/**
 * Contrato de provider de pagamento (ADR-016 §5).
 *
 * O MockProvider aprova na hora. Quando o PSP real entrar (S21:
 * Mercado Pago / Asaas), um novo provider implementa essa mesma
 * interface — `charge()` cria a cobrança e devolve pending/QR, e o
 * webhook do PSP chama `PaymentService.markPaid()`. A máquina de
 * estados do appointment não muda.
 */
export interface ChargeInput {
  appointmentId: string;
  method: PaymentMethod;
  amountCents: number;
  /** Descrição que aparece pro cliente (ex: "Corte — Barbearia do Jaja"). */
  description: string;
  /** Comissão da plataforma (marketplace `application_fee`). ADR-022 §2. */
  applicationFeeCents?: number;
  /** Token MP do vendedor (barbearia) — cobra na conta dele. ADR-022 §2. */
  sellerAccessToken?: string;
  /** Email do pagador (MP exige pra Pix). */
  payerEmail?: string;
  /** Cartão: token gerado no cliente (MP.js — PCI). */
  cardToken?: string;
  /** Cartão: número de parcelas. */
  installments?: number;
}

export interface ChargeResult {
  /** ID da cobrança no provider (mock gera fake). */
  providerPaymentId: string;
  /** 'paid' no mock (aprovação imediata); 'pending' num PSP real até webhook. */
  status: 'paid' | 'pending';
  /** Payload bruto pra auditoria/reconciliação. */
  payload: Record<string, unknown>;
  /** Pix: QR code copia-e-cola (mock devolve fake). */
  pixQrCode?: string;
  /** Pix: imagem do QR em base64 (PNG) pra UI renderizar direto. */
  pixQrCodeBase64?: string;
}

export interface RefundInput {
  /** ID da cobrança no provider (do Payment.providerPaymentId). */
  providerPaymentId: string;
  /** Token do vendedor (marketplace) — quem detém a cobrança. */
  sellerAccessToken?: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  /**
   * Estorna a cobrança no PSP (ADR-022 §5). Mock = no-op. Idempotente:
   * o PaymentService só chama quando há Payment 'paid'.
   */
  refund(input: RefundInput): Promise<void>;
}

/** Token de injeção do provider ativo. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
