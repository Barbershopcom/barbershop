import { Injectable, Logger } from '@nestjs/common';
import type { BillingCycle, SubscriptionStatus } from '@barbearia/schemas';
import { addMonths } from 'date-fns';

import { PrismaService } from '../prisma/prisma.service';

export function mapPreapprovalStatus(mpStatus: string): SubscriptionStatus | null {
  if (mpStatus === 'cancelled') return 'cancelled';
  if (mpStatus === 'paused') return 'suspended';
  return null;
}

export function computeNextPeriodEnd(cycle: BillingCycle, from: Date): Date {
  return addMonths(from, cycle === 'annual' ? 12 : 1);
}

@Injectable()
export class BillingService {
  private static readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  getByPreapprovalId(mpPreapprovalId: string) {
    return this.prisma.subscription.findFirst({ where: { mpPreapprovalId } });
  }

  getByTenant(tenantId: string) {
    return this.prisma.subscription.findUnique({ where: { tenantId } });
  }

  async applyRecurringPayment(
    mpPreapprovalId: string,
    approved: boolean,
    when: Date,
  ): Promise<void> {
    const sub = await this.getByPreapprovalId(mpPreapprovalId);
    if (!sub) {
      BillingService.logger.warn(
        `Cobrança recorrente sem Subscription local: preapproval=${mpPreapprovalId}`,
      );
      return;
    }
    if (approved) {
      // O ciclo vem SEMPRE da Subscription local (billing_cycle é NOT NULL),
      // nunca de um valor externo — período de renovação correto por contrato.
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          lastPaymentStatus: 'approved',
          lastChargedAt: when,
          currentPeriodEnd: computeNextPeriodEnd(sub.billingCycle as BillingCycle, when),
        },
      });
    } else {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'past_due', lastPaymentStatus: 'rejected' },
      });
    }
  }

  async applyPreapprovalStatus(mpPreapprovalId: string, mpStatus: string): Promise<void> {
    const mapped = mapPreapprovalStatus(mpStatus);
    if (!mapped) return;
    const sub = await this.getByPreapprovalId(mpPreapprovalId);
    if (!sub) {
      BillingService.logger.warn(
        `Status de preapproval sem Subscription local: preapproval=${mpPreapprovalId} status=${mpStatus}`,
      );
      return;
    }
    await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: mapped } });
  }
}
