/**
 * Integration test — PlanLimitsService + trava de funcionários nos controllers.
 *
 * Strategy (igual admin-billing.spec.ts): service/controllers reais contra o
 * DB de teste; RLS via withCtx quando o código roda dentro de ctx.tx.
 */

import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PlanLimitsService } from '../src/billing/plan-limits.service';
import type { TenantContextValue } from '../src/tenancy/tenant-context';

const prisma = new PrismaClient();
const svc = new PlanLimitsService();

let tenantId: string;
let barbershopId: string;
const adminId = randomUUID();

beforeAll(async () => {
  await prisma.appUser.create({
    data: { id: adminId, email: `admin-pl-${adminId}@test.invalid` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `pl-${randomUUID().slice(0, 8)}`, name: 'Plan Limits Test' },
  });
  tenantId = tenant.id;
  await prisma.tenantMembership.create({
    data: { userId: adminId, tenantId, roles: ['admin'] },
  });
  const org = await prisma.organization.create({ data: { tenantId, name: 'Org' } });
  const loc = await prisma.location.create({
    data: {
      tenantId,
      organizationId: org.id,
      name: 'Loc',
      addressLine1: 'Rua X, 1',
      city: 'SP',
      state: 'SP',
      postalCode: '01000-000',
      country: 'BR',
    },
  });
  const shop = await prisma.barbershop.create({
    data: { tenantId, locationId: loc.id, name: 'Shop 1' },
  });
  barbershopId = shop.id;
  await prisma.subscription.create({
    data: { tenantId, tier: 'free', billingCycle: 'monthly', status: 'active', priceCents: 0 },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.appUser.deleteMany({ where: { id: adminId } });
  await prisma.$disconnect();
});

/** Roda fn num TenantContextValue real (SET LOCAL ROLE + GUCs, igual interceptor). */
async function withCtx<T>(
  userId: string,
  tenantContextId: string | null,
  fn: (ctx: TenantContextValue) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    if (tenantContextId) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantContextId}, true)`;
    }
    const ctx: TenantContextValue = { userId, tenantId: tenantContextId ?? null, tx };
    return fn(ctx);
  });
}

// ---------------------------------------------------------------------------

describe('PlanLimitsService', () => {
  it('free: 2ª unidade estoura com PLAN_LIMIT_REACHED', async () => {
    await expect(svc.assertCanAddUnit(prisma, tenantId)).rejects.toMatchObject({
      response: {
        code: 'PLAN_LIMIT_REACHED',
        resource: 'unit',
        limit: 1,
        current: 1,
        tier: 'free',
      },
    });
  });

  it('free: até 2 funcionários passa, 3º estoura', async () => {
    await expect(svc.assertCanAddEmployee(prisma, tenantId, barbershopId)).resolves.toBeUndefined();
    await prisma.employee.createMany({
      data: [
        { tenantId, barbershopId, displayName: 'B1', role: 'barber' },
        { tenantId, barbershopId, displayName: 'B2', role: 'barber' },
      ],
    });
    await expect(svc.assertCanAddEmployee(prisma, tenantId, barbershopId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('sem subscription trata como free', async () => {
    await prisma.subscription.delete({ where: { tenantId } });
    await expect(svc.assertCanAddUnit(prisma, tenantId)).rejects.toThrow(ConflictException);
    await prisma.subscription.create({
      data: { tenantId, tier: 'pro', billingCycle: 'monthly', status: 'active', priceCents: 9900 },
    });
  });

  it('pro: 2ª unidade passa; tenantUsage reflete contagens', async () => {
    await expect(svc.assertCanAddUnit(prisma, tenantId)).resolves.toBeUndefined();
    const usage = await svc.tenantUsage(prisma, tenantId);
    expect(usage).toEqual({ units: 1, maxEmployeesInAnyUnit: 2 });
  });
});
