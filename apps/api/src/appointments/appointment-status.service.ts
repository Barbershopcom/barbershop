import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { slotOccupyingStatuses } from '@barbearia/schemas';

import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Máquina de estados central de appointment (ADR-017 §3).
 *
 * Toda transição de status passa por aqui — em vez de espalhar
 * `if status === 'pending'` por controllers. Valida a origem, aplica numa
 * transação atômica (resolve race barbeiro-confirma-vs-job-expira), e
 * dispara efeitos colaterais (refund no estorno; notificações são plugadas
 * na Fase 3 via callback pra não acoplar este service ao email/push).
 *
 * Transições suportadas:
 *   pending → confirmed   (barbeiro)
 *   pending → cancelled   (barbeiro recusa)         + refund
 *   pending → expired     (job, deadline vencido)   + refund
 */
@Injectable()
export class AppointmentStatusService {
  private static readonly logger = new Logger(AppointmentStatusService.name);

  /** Hook de notificação setado na Fase 3 (evita dep circular com email/push). */
  private notifier: AppointmentTransitionNotifier | null = null;

  constructor(
    private readonly prisma: PrismaService,
    // forwardRef: ciclo status→payment→notifier→status (ADR-017).
    @Inject(forwardRef(() => PaymentService))
    private readonly payments: PaymentService,
  ) {}

  registerNotifier(n: AppointmentTransitionNotifier): void {
    this.notifier = n;
  }

  /** Barbeiro confirma um pending → confirmed. */
  async confirm(appointmentId: string): Promise<TransitionResult> {
    const r = await this.transition(appointmentId, 'pending', 'confirmed', {});
    if (r.ok) void this.notify('confirmed', appointmentId);
    return r;
  }

  /** Barbeiro recusa um pending → cancelled (+ refund). */
  async reject(appointmentId: string, reason?: string): Promise<TransitionResult> {
    const r = await this.transition(appointmentId, 'pending', 'cancelled', {
      cancelledBy: 'barber',
      cancelReason: reason ?? 'Recusado pelo barbeiro',
    });
    if (r.ok) {
      await this.payments.refund(appointmentId);
      void this.notify('rejected', appointmentId);
    }
    return r;
  }

  /** Job de expiração: pending vencido → expired (+ refund). No-op se já mudou. */
  async expire(appointmentId: string): Promise<TransitionResult> {
    const r = await this.transition(appointmentId, 'pending', 'expired', {
      cancelledBy: 'system',
      cancelReason: 'Não confirmado a tempo',
    });
    if (r.ok) {
      await this.payments.refund(appointmentId);
      void this.notify('expired', appointmentId);
    }
    return r;
  }

  /**
   * Barbeiro marca corte como concluído: confirmed → completed (ADR-018 §1).
   * Sem refund (serviço prestado). Incrementa o contador de cortes do cliente
   * (ADR-019 §3) e abre o gancho de avaliação (cliente pode dar review).
   */
  async complete(appointmentId: string): Promise<TransitionResult> {
    const r = await this.transition(appointmentId, 'confirmed', 'completed', {});
    if (r.ok) {
      // Contador de cortes do cliente (cache; só quando há conta vinculada).
      const appt = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { customerId: true },
      });
      if (appt?.customerId) {
        await this.prisma.customer.update({
          where: { id: appt.customerId },
          data: { completedCutsCount: { increment: 1 } },
        });
      }
    }
    return r;
  }

  /**
   * Barbeiro marca falta do cliente: confirmed → no_show (ADR-018 §1).
   * Sem refund (cliente faltou — política padrão do mercado).
   */
  async noShow(appointmentId: string): Promise<TransitionResult> {
    return this.transition(appointmentId, 'confirmed', 'no_show', {});
  }

  /**
   * Cancela um appointment ativo por causa de folga do barbeiro (ADR-018 §7).
   * Aceita qualquer status que ocupa slot (awaiting_payment|pending|confirmed)
   * → cancelled + refund + notifica o cliente. No-op se já saiu de um estado
   * ativo (race com job/cliente). Reusa o evento 'rejected' pra notificação.
   */
  async cancelForTimeOff(appointmentId: string, reason: string): Promise<TransitionResult> {
    const updated = await this.prisma.appointment.updateMany({
      where: { id: appointmentId, status: { in: [...slotOccupyingStatuses] } },
      data: {
        status: 'cancelled',
        cancelledBy: 'barber',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    if (updated.count === 0) {
      const current = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });
      return { ok: false, currentStatus: current?.status ?? null };
    }
    await this.payments.refund(appointmentId);
    void this.notify('rejected', appointmentId);
    AppointmentStatusService.logger.log(`Appt ${appointmentId}: folga → cancelled`);
    return { ok: true, currentStatus: 'cancelled' };
  }

  /**
   * Núcleo atômico: muda status SE a origem bater. UPDATE condicional
   * (`WHERE id AND status=from`) resolve a corrida — só um vencedor.
   * Retorna {ok:false, currentStatus} se a origem não bateu (no-op).
   */
  private async transition(
    appointmentId: string,
    from: string,
    to: string,
    extra: { cancelledBy?: string; cancelReason?: string },
  ): Promise<TransitionResult> {
    const setCancelMeta = to === 'cancelled' || to === 'expired';
    const updated = await this.prisma.appointment.updateMany({
      where: { id: appointmentId, status: from },
      data: {
        status: to,
        ...(setCancelMeta
          ? {
              cancelledBy: extra.cancelledBy ?? null,
              cancelledAt: new Date(),
              cancelReason: extra.cancelReason ?? null,
            }
          : {}),
      },
    });

    if (updated.count === 0) {
      // Origem não bateu: ou não existe, ou outro ator já transicionou.
      const current = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });
      AppointmentStatusService.logger.debug(
        `Transição ${from}→${to} no-op em ${appointmentId} (atual: ${current?.status ?? 'inexistente'})`,
      );
      return { ok: false, currentStatus: current?.status ?? null };
    }

    AppointmentStatusService.logger.log(`Appt ${appointmentId}: ${from} → ${to}`);
    return { ok: true, currentStatus: to };
  }

  private async notify(
    event: AppointmentTransitionEvent,
    appointmentId: string,
  ): Promise<void> {
    if (!this.notifier) return;
    try {
      await this.notifier(event, appointmentId);
    } catch (err) {
      AppointmentStatusService.logger.warn(
        `Notificação ${event} falhou pra ${appointmentId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

export interface TransitionResult {
  ok: boolean;
  /** Status atual após a tentativa (pra controller decidir 409 vs 200). */
  currentStatus: string | null;
}

export type AppointmentTransitionEvent = 'confirmed' | 'rejected' | 'expired';

/** Callback de notificação plugado na Fase 3. */
export type AppointmentTransitionNotifier = (
  event: AppointmentTransitionEvent,
  appointmentId: string,
) => Promise<void>;
