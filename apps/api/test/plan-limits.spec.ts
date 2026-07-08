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
import { EmployeesController } from '../src/employees/employees.controller';
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
    data: { tenantId, locationId: loc.id, name: 'Shop 1', slug: `shop-${randomUUID().slice(0, 8)}` },
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

describe('EmployeesController — trava do plano', () => {
  const employeesController = new EmployeesController(svc);

  beforeAll(async () => {
    // Volta o tenant pro free: os 2 ativos (B1, B2) já ocupam o teto.
    await prisma.subscription.update({
      where: { tenantId },
      data: { tier: 'free', priceCents: 0 },
    });
  });

  it('create estoura no teto do tier', async () => {
    await expect(
      withCtx(adminId, tenantId, (ctx) =>
        employeesController.create(
          ctx,
          { displayName: 'B3', role: 'barber', isActive: true },
          undefined,
        ),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('reativar no teto estoura; editar nome e desativar não', async () => {
    const inactive = await prisma.employee.create({
      data: { tenantId, barbershopId, displayName: 'B4', role: 'barber', isActive: false },
    });

    await expect(
      withCtx(adminId, tenantId, (ctx) =>
        employeesController.update(ctx, inactive.id, { isActive: true }),
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      withCtx(adminId, tenantId, (ctx) =>
        employeesController.update(ctx, inactive.id, { displayName: 'B4x' }),
      ),
    ).resolves.toBeDefined();

    // Desativar um ativo nunca passa pela trava.
    const active = await prisma.employee.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    await expect(
      withCtx(adminId, tenantId, (ctx) =>
        employeesController.update(ctx, active!.id, { isActive: false }),
      ),
    ).resolves.toBeDefined();
    // restaura
    await prisma.employee.update({ where: { id: active!.id }, data: { isActive: true } });
  });

  it('unidade desativada não conta no teto de unidades', async () => {
    await prisma.subscription.update({
      where: { tenantId },
      data: { tier: 'free', priceCents: 0 },
    });
    await prisma.barbershop.update({ where: { id: barbershopId }, data: { isActive: false } });
    await expect(svc.assertCanAddUnit(prisma, tenantId)).resolves.toBeUndefined();
    const usage = await svc.tenantUsage(prisma, tenantId);
    expect(usage.units).toBe(0);
    expect(usage.maxEmployeesInAnyUnit).toBe(0);
    await prisma.barbershop.update({ where: { id: barbershopId }, data: { isActive: true } });
  });

  it('abaixo do teto, create passa', async () => {
    await prisma.subscription.update({
      where: { tenantId },
      data: { tier: 'basic', priceCents: 4900 },
    });
    await expect(
      withCtx(adminId, tenantId, (ctx) =>
        employeesController.create(
          ctx,
          { displayName: 'B5', role: 'barber', isActive: true },
          undefined,
        ),
      ),
    ).resolves.toBeDefined();
  });
});
