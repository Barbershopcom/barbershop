/**
 * Integration test — AdminBillingController (admin endpoints para assinatura).
 *
 * Strategy: instancia o controller REAL e chama métodos diretamente, passando
 * um TenantContextValue real dentro de uma transação com SET LOCAL ROLE +
 * GUCs (igual ao TenantInterceptor). MercadoPagoProvider é mockado pois os
 * testes não devem bater na API real do MP.
 *
 * Testes:
 *  1. GET /admin/subscription retorna status da assinatura semeada.
 *  2. GET sem tenantId lança ForbiddenException (403).
 *  3. POST /admin/subscription/cancel chama mp.cancelPreapproval e status vira 'cancelled'.
 */

import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { AdminBillingController } from '../src/billing/admin-billing.controller';
import type { AuthenticatedUser } from '../src/auth/auth.decorators';
import type { TenantContextValue } from '../src/tenancy/tenant-context';
import type { MercadoPagoProvider } from '../src/payment/mercadopago.provider';

const prisma = new PrismaClient();

// Mock MercadoPagoProvider
const mpMock = {
  cancelPreapproval: jest.fn().mockResolvedValue(undefined),
  updatePreapprovalCard: jest.fn().mockResolvedValue(undefined),
} as unknown as MercadoPagoProvider;

const controller = new AdminBillingController(mpMock);

// Atores
const adminId = randomUUID();
const nonAdminId = randomUUID();

let tenantId: string;
let subscriptionId: string;

beforeAll(async () => {
  await prisma.appUser.createMany({
    data: [
      { id: adminId, email: `admin-billing-${adminId}@test.invalid` },
      { id: nonAdminId, email: `nonadmin-billing-${nonAdminId}@test.invalid` },
    ],
    skipDuplicates: true,
  });

  const tenant = await prisma.tenant.create({
    data: { slug: `ab-${randomUUID().slice(0, 8)}`, name: 'Billing Admin Test' },
  });
  tenantId = tenant.id;

  // Admin membership
  await prisma.tenantMembership.create({
    data: { userId: adminId, tenantId, roles: ['admin'] },
  });

  // Non-admin membership (barber)
  await prisma.tenantMembership.create({
    data: { userId: nonAdminId, tenantId, roles: ['barber'] },
  });

  // Seed a subscription
  const sub = await prisma.subscription.create({
    data: {
      tenantId,
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'trialing',
      priceCents: 9900,
      mpPreapprovalId: 'preapproval-test-123',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  subscriptionId = sub.id;
});

afterAll(async () => {
  const tenantIds = [tenantId].filter(Boolean);
  if (tenantIds.length > 0) {
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  await prisma.appUser.deleteMany({ where: { id: { in: [adminId, nonAdminId] } } });
  await prisma.$disconnect();
});

/**
 * Roda fn com um TenantContextValue real dentro de uma tx app_user + GUCs.
 */
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
    const user: AuthenticatedUser = {
      id: userId,
      email: `${userId}@test.invalid`,
      raw: {},
    };
    return fn(ctx, user);
  });
}

// ---------------------------------------------------------------------------

describe('AdminBillingController — GET /admin/subscription', () => {
  it('admin com tenant context retorna status da assinatura semeada', async () => {
    const result = await withCtx(adminId, tenantId, (ctx, user) => controller.get(ctx, user));

    expect(result).not.toBeNull();
    expect(result!.status).toBe('trialing');
    expect(result!.billingCycle).toBe('monthly');
    expect(result!.priceCents).toBe(9900);
    expect(result!.trialEndsAt).toBeDefined();
  });

  it('sem tenantId lança ForbiddenException (403)', async () => {
    // Passa tenantId=null → assertTenantAdmin lança "Header X-Tenant-Id obrigatório."
    await expect(
      withCtx(adminId, null, (ctx, user) => controller.get(ctx, user)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('usuário sem role admin recebe 403', async () => {
    await expect(
      withCtx(nonAdminId, tenantId, (ctx, user) => controller.get(ctx, user)),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('AdminBillingController — POST /admin/subscription/cancel', () => {
  it('admin cancela: chama mp.cancelPreapproval e subscription.status vira cancelled', async () => {
    jest.clearAllMocks();

    const result = await withCtx(adminId, tenantId, (ctx, user) => controller.cancel(ctx, user));

    expect(result).toEqual({ ok: true });
    expect(mpMock.cancelPreapproval).toHaveBeenCalledWith('preapproval-test-123');

    // Verifica que o status foi persistido (fora da transação de teste via prisma direto)
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });
    expect(sub?.status).toBe('cancelled');
  });
});
