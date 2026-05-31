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
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/** Token de injeção do provider ativo. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
