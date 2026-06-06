import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computePriceBreakdown,
  type PaymentDto,
  type PaymentMethod,
} from '@barbearia/schemas';

import {
  APPOINTMENT_EXPIRATION_QUEUE,
  type ExpirationPayload,
} from '../jobs/jobs-worker.service';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';

/** Janela de confirmação do barbeiro após o pagamento (ADR-017 §1). */
const CONFIRM_WINDOW_MS = 60 * 60 * 1000; // 1h

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
    private readonly jobs: JobsService,
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
        startAt: true,
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

    // Deadline de confirmação: o que vier primeiro entre +1h e o corte.
    const now = Date.now();
    const confirmDeadline = new Date(
      Math.min(now + CONFIRM_WINDOW_MS, appt.startAt.getTime()),
    );

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
      // confirmDeadline = min(agora+1h, startAt) — ADR-017 §1.
      if (paid) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: { status: 'pending', confirmDeadline },
        });
      }

      return p;
    });

    PaymentService.logger.log(
      `Pagamento ${payment.status} appt=${appt.id} método=${args.method} total=${breakdown.amountCents}c`,
    );

    // Agenda expiração (best-effort, fora da transação — ADR-017 §2).
    if (paid) {
      await this.scheduleExpiration(appt.id, confirmDeadline);
    }

    return {
      payment: toDto(payment),
      pixQrCode: charge.pixQrCode,
    };
  }

  /**
   * Agenda o job que expira o appointment se o barbeiro não confirmar até
   * o deadline. Idempotente no worker (expire() é no-op se já mudou).
   * Best-effort: falha não trava o pagamento.
   */
  private async scheduleExpiration(apptId: string, deadline: Date): Promise<void> {
    try {
      const payload: ExpirationPayload = { apptId };
      await this.jobs.send(APPOINTMENT_EXPIRATION_QUEUE, payload, {
        startAfter: deadline,
        retryLimit: 3,
        retryBackoff: true,
      });
    } catch (err) {
      PaymentService.logger.warn(
        `Falha ao agendar expiração de ${apptId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Estorna o pagamento de um appointment (recusa/expiração — ADR-017 §4).
   * Mock: paid → refunded + refundedAt. Não move dinheiro (não há), mas
   * mantém o registro coerente pro PSP real (S21) chamar o refund de verdade.
   *
   * Idempotente e best-effort: se não há payment pago, no-op silencioso
   * (ex: booking guest que nunca pagou, ou já estornado).
   */
  async refund(appointmentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { appointmentId },
      select: { id: true, status: true },
    });
    if (!payment || payment.status !== 'paid') {
      return; // nada pago ou já estornado — nada a fazer
    }
    await this.prisma.payment.update({
      where: { appointmentId },
      data: { status: 'refunded', refundedAt: new Date() },
    });
    PaymentService.logger.log(`Pagamento estornado (mock) appt=${appointmentId}`);
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
