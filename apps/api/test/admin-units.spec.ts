/**
 * Integration test — AdminUnitsController (multi-unidade, spec 2026-07-07).
 *
 * Strategy (igual admin-billing.spec.ts): controller real + TenantContextValue
 * real via withCtx (SET LOCAL ROLE + GUCs). PlanLimitsService real.
 */

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PlanLimitsService } from '../src/billing/plan-limits.service';
import { AdminUnitsController } from '../src/units/admin-units.controller';
import type { AuthenticatedUser } from '../src/auth/auth.decorators';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { TenantContextValue } from '../src/tenancy/tenant-context';

const prisma = new PrismaClient();
// PrismaService estende PrismaClient — pro controller, o client cru é equivalente.
const controller = new AdminUnitsController(
  new PlanLimitsService(),
  prisma as unknown as PrismaService,
);

const adminId = randomUUID();
const barberId = randomUUID();
const suffix = randomUUID().slice(0, 8);

let tenantId: string;
let firstShopId: string;

beforeAll(async () => {
  await prisma.appUser.createMany({
    data: [
      { id: adminId, email: `admin-units-${adminId}@test.invalid` },
      { id: barberId, email: `barber-units-${barberId}@test.invalid` },
    ],
    skipDuplicates: true,
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `un-${suffix}`, name: 'Units Test' },
  });
  tenantId = tenant.id;
  await prisma.tenantMembership.createMany({
    data: [
      { userId: adminId, tenantId, roles: ['admin'] },
      { userId: barberId, tenantId, roles: ['barber'] },
    ],
  });
  const org = await prisma.organization.create({ data: { tenantId, name: 'Org' } });
  const loc = await prisma.location.create({
    data: {
      tenantId,
      organizationId: org.id,
      name: 'Matriz',
      addressLine1: 'Rua X, 1',
      city: 'SP',
      state: 'SP',
      postalCode: '01000-000',
      country: 'BR',
    },
  });
  const shop = await prisma.barbershop.create({
    data: { tenantId, locationId: loc.id, name: 'Matriz', slug: `un-${suffix}` },
  });
  firstShopId = shop.id;
  await prisma.subscription.create({
    data: { tenantId, tier: 'basic', billingCycle: 'monthly', status: 'active', priceCents: 4900 },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.appUser.deleteMany({ where: { id: { in: [adminId, barberId] } } });
  await prisma.$disconnect();
});

async function withCtx<T>(
  userId: string,
  tenantContextId: string | null,
  fn: (ctx: TenantContextValue, user: AuthenticatedUser) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    if (tenantContextId) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantContextId}, true)`;
    }
    const ctx: TenantContextValue = { userId, tenantId: tenantContextId ?? null, tx };
    const user: AuthenticatedUser = { id: userId, email: `${userId}@test.invalid`, raw: {} };
    return fn(ctx, user);
  });
}

const unitPayload = (slug: string, name = 'Filial Centro') => ({
  name,
  slug,
  addressLine1: 'Rua Y, 2',
  city: 'SP',
  state: 'SP',
  postalCode: '01000-000',
});

// ---------------------------------------------------------------------------

describe('AdminUnitsController', () => {
  let secondUnitId: string;

  it('GET lista a unidade existente com limite do plano', async () => {
    const r = await withCtx(adminId, tenantId, (ctx, user) => controller.list(ctx, user));
    expect(r.tier).toBe('basic');
    expect(r.limit).toBe(2);
    expect(r.units).toHaveLength(1);
    expect(r.units[0]).toMatchObject({ slug: `un-${suffix}`, isActive: true, employeeCount: 0 });
  });

  it('cria a 2ª unidade no basic', async () => {
    const r = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.create(ctx, user, unitPayload(`filial-${suffix}`)),
    );
    expect(r).toMatchObject({
      slug: `filial-${suffix}`,
      name: 'Filial Centro',
      isActive: true,
      employeeCount: 0,
    });
    secondUnitId = r.id;
  });

  it('3ª unidade estoura o teto do basic → 409 PLAN_LIMIT_REACHED', async () => {
    await expect(
      withCtx(adminId, tenantId, (ctx, user) =>
        controller.create(ctx, user, unitPayload(`filial2-${suffix}`)),
      ),
    ).rejects.toMatchObject({
      response: { code: 'PLAN_LIMIT_REACHED', resource: 'unit', limit: 2, tier: 'basic' },
    });
  });

  it('slug de outra unidade ou de um tenant → 409', async () => {
    // desativa a 2ª pra liberar o teto e isolar o teste de slug
    await prisma.barbershop.update({ where: { id: secondUnitId }, data: { isActive: false } });

    // slug já usado por barbershop (a matriz)
    await expect(
      withCtx(adminId, tenantId, (ctx, user) =>
        controller.create(ctx, user, unitPayload(`un-${suffix}`)),
      ),
    ).rejects.toThrow(ConflictException);

    // slug já usado por um TENANT alheio
    const otherTenant = await prisma.tenant.create({
      data: { slug: `other-${suffix}`, name: 'Outro' },
    });
    await expect(
      withCtx(adminId, tenantId, (ctx, user) =>
        controller.create(ctx, user, unitPayload(`other-${suffix}`)),
      ),
    ).rejects.toThrow(ConflictException);
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });

  it('reativar unidade passa pela trava; com folga, reativa', async () => {
    // teto = 2, só a matriz ativa → reativar cabe
    const r = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.update(ctx, user, secondUnitId, { isActive: true }),
    );
    expect(r.isActive).toBe(true);

    // agora desativa a matriz e cria uma 3ª… não: teto 2, 2 ativas → nova reativação estoura
    await prisma.barbershop.update({ where: { id: secondUnitId }, data: { isActive: false } });
    const third = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.create(ctx, user, unitPayload(`filial3-${suffix}`, 'Filial Norte')),
    );
    // 2 ativas de novo (matriz + filial3); reativar a 2ª estoura
    await expect(
      withCtx(adminId, tenantId, (ctx, user) =>
        controller.update(ctx, user, secondUnitId, { isActive: true }),
      ),
    ).rejects.toThrow(ConflictException);
    // limpeza: some com a 3ª
    await prisma.barbershop.delete({ where: { id: third.id } });
  });

  it('PATCH edita nome e endereço', async () => {
    const r = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.update(ctx, user, firstShopId, { name: 'Matriz Renovada', city: 'Campinas' }),
    );
    expect(r).toMatchObject({ name: 'Matriz Renovada', city: 'Campinas' });
  });

  it('user sem role admin → 403', async () => {
    await expect(
      withCtx(barberId, tenantId, (ctx, user) => controller.list(ctx, user)),
    ).rejects.toThrow(ForbiddenException);
  });
});
