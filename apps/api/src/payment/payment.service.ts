import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computePriceBreakdown,
  type PaymentDto,
  type PaymentMethod,
} from '@barbearia/schemas';

import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';

/**
 * Orquestra pagamento de um appointment (ADR-016 §5).
 *
 * Fluxo do mock:
 *   1) appointment criado com status 'awaiting_payment' (booking.service)
 *   2) cliente escolhe método → pay() calcula fee, cobra no provider,
 *      grava Payment, e ao aprovar move appointment → 'pending'
 *      (aguardando barbeiro confirmar)
 *
 * Idempotente por appointment: se já existe Payment pago, retorna ele
 * (evita cobrar duas vezes num retry/duplo-clique).
 */
@Injectable()
export class PaymentService {
  private static readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Cobra o pagamento de um appointment e, se aprovado, transiciona
   * awaiting_payment → pending. Retorna o PaymentDto + QR (se Pix).
   *
   * Lança erro de domínio (string code) que o controller mapeia pra HTTP.
   */
  async pay(args: {
    appointmentId: string;
    method: PaymentMethod;
    description: string;
  }): Promise<{ payment: PaymentDto; pixQrCode?: string }> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: args.appointmentId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        priceCents: true,
        payment: {
          select: {
            id: true,
            appointmentId: true,
            provider: true,
            method: true,
            status: true,
            amountCents: true,
            feeCents: true,
            paidAt: true,
          },
        },
      },
    });

    if (!appt) {
      throw new PaymentError('not_found', 'Agendamento não encontrado.');
    }

    // Idempotência: já pago → devolve o existente (sem cobrar de novo).
    if (appt.payment && appt.payment.status === 'paid') {
      return { payment: toDto(appt.payment) };
    }

    if (appt.status !== 'awaiting_payment') {
      throw new PaymentError(
        'invalid_status',
        `Pagamento só é possível em 'awaiting_payment' (atual: '${appt.status}').`,
      );
    }

    const breakdown = computePriceBreakdown(appt.priceCents, args.method);

    // Cobra no provider (mock aprova na hora).
    const charge = await this.provider.charge({
      appointmentId: appt.id,
      method: args.method,
      amountCents: breakdown.amountCents,
      description: args.description,
    });

    const paid = charge.status === 'paid';

    // Persiste Payment + transiciona appointment numa transação só.
    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.upsert({
        where: { appointmentId: appt.id },
        create: {
          tenantId: appt.tenantId,
          appointmentId: appt.id,
          provider: this.provider.name,
          method: args.method,
          status: paid ? 'paid' : 'pending',
          amountCents: breakdown.amountCents,
          feeCents: breakdown.feeCents,
          platformFeeCents: breakdown.platformFeeCents,
          providerPaymentId: charge.providerPaymentId,
          providerPayload: charge.payload as Prisma.InputJsonValue,
          paidAt: paid ? new Date() : null,
        },
        update: {
          method: args.method,
          status: paid ? 'paid' : 'pending',
          amountCents: breakdown.amountCents,
          feeCents: breakdown.feeCents,
          platformFeeCents: breakdown.platformFeeCents,
          providerPaymentId: charge.providerPaymentId,
          providerPayload: charge.payload as Prisma.InputJsonValue,
          paidAt: paid ? new Date() : null,
        },
        select: {
          id: true,
          appointmentId: true,
          provider: true,
          method: true,
          status: true,
          amountCents: true,
          feeCents: true,
          paidAt: true,
        },
      });

      // awaiting_payment → pending só quando aprovado.
      if (paid) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: { status: 'pending' },
        });
      }

      return p;
    });

    PaymentService.logger.log(
      `Pagamento ${payment.status} appt=${appt.id} método=${args.method} total=${breakdown.amountCents}c`,
    );

    return {
      payment: toDto(payment),
      pixQrCode: charge.pixQrCode,
    };
  }
}

interface PaymentRow {
  id: string;
  appointmentId: string;
  provider: string;
  method: string;
  status: string;
  amountCents: number;
  feeCents: number;
  paidAt: Date | null;
}

function toDto(p: PaymentRow): PaymentDto {
  return {
    id: p.id,
    appointmentId: p.appointmentId,
    provider: p.provider,
    method: p.method as PaymentMethod,
    status: p.status as PaymentDto['status'],
    amountCents: p.amountCents,
    feeCents: p.feeCents,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
  };
}

/** Erro de domínio do pagamento. Controller mapeia pra HTTP. */
export class PaymentError extends Error {
  constructor(
    public readonly code: 'not_found' | 'invalid_status',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
