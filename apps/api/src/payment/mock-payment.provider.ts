import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

import type { ChargeInput, ChargeResult, PaymentProvider } from './payment-provider';

/**
 * Provider mock (ADR-016 §5). Aprova TODO pagamento na hora.
 * Serve pro fluxo ponta-a-ponta funcionar sem PSP real (restrição do
 * council: pagamento de verdade fica pro fim — S21).
 *
 * Pix: devolve um "copia-e-cola" fake só pra UI ter o que mostrar.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private static readonly logger = new Logger(MockPaymentProvider.name);

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const providerPaymentId = `mock_${randomUUID()}`;
    MockPaymentProvider.logger.log(
      `[MOCK] aprovando ${input.method} de ${input.amountCents}c pra appt ${input.appointmentId}`,
    );
    const result: ChargeResult = {
      providerPaymentId,
      status: 'paid',
      payload: {
        mock: true,
        method: input.method,
        amountCents: input.amountCents,
        approvedAt: new Date().toISOString(),
      },
    };
    if (input.method === 'pix') {
      result.pixQrCode = `00020126MOCKPIX${providerPaymentId.slice(5, 13)}5204000053039865802BR`;
    }
    return result;
  }
}
