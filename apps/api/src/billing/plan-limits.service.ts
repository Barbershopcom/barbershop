import { ConflictException, Injectable } from '@nestjs/common';
import { limitsForTier, type PlanTier } from '@barbearia/schemas';
import type { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Enforcement dos tetos do plano (spec 2026-07-07). Recebe o client/tx do
 * chamador: nos controllers admin é o ctx.tx (RLS), nos testes o prisma cru.
 * Sem Subscription → trata como 'free' (não deveria acontecer em prod).
 */
@Injectable()
export class PlanLimitsService {
  private async tierOf(tx: Db, tenantId: string): Promise<PlanTier> {
    const sub = await tx.subscription.findUnique({
      where: { tenantId },
      select: { tier: true },
    });
    return (sub?.tier as PlanTier | undefined) ?? 'free';
  }

  async tenantUsage(
    tx: Db,
    tenantId: string,
  ): Promise<{ units: number; maxEmployeesInAnyUnit: number }> {
    const units = await tx.barbershop.count({ where: { tenantId, isActive: true } });
    const grouped = await tx.employee.groupBy({
      by: ['barbershopId'],
      where: { tenantId, isActive: true, barbershop: { isActive: true } },
      _count: { _all: true },
    });
    const maxEmployeesInAnyUnit = grouped.reduce((m, g) => Math.max(m, g._count._all), 0);
    return { units, maxEmployeesInAnyUnit };
  }

  private limitError(
    resource: 'unit' | 'employee',
    limit: number,
    current: number,
    tier: PlanTier,
  ): ConflictException {
    const noun = resource === 'unit' ? 'unidades' : 'funcionários por unidade';
    return new ConflictException({
      code: 'PLAN_LIMIT_REACHED',
      resource,
      limit,
      current,
      tier,
      message: `Seu plano ${tier} permite ${limit} ${noun}. Faça upgrade para adicionar mais.`,
    });
  }

  async assertCanAddUnit(tx: Db, tenantId: string): Promise<void> {
    const tier = await this.tierOf(tx, tenantId);
    const { maxUnits } = limitsForTier(tier);
    const current = await tx.barbershop.count({ where: { tenantId, isActive: true } });
    if (current >= maxUnits) throw this.limitError('unit', maxUnits, current, tier);
  }

  async assertCanAddEmployee(tx: Db, tenantId: string, barbershopId: string): Promise<void> {
    const tier = await this.tierOf(tx, tenantId);
    const { maxEmployeesPerUnit } = limitsForTier(tier);
    const current = await tx.employee.count({
      where: { tenantId, barbershopId, isActive: true },
    });
    if (current >= maxEmployeesPerUnit) {
      throw this.limitError('employee', maxEmployeesPerUnit, current, tier);
    }
  }
}
