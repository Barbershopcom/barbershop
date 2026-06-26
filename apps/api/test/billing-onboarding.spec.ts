/**
 * Integration test — Onboarding cria Subscription + preapproval MP.
 *
 * Padrão de cancel-fee.spec.ts:
 *   - PrismaClient real contra o banco de teste local.
 *   - MercadoPagoProvider substituído por mock (jest.fn()).
 *   - Controller instanciado direto; ctx injetado manualmente (bypassando o
 *     @Tx() decorator) — o mesmo padrão que os outros specs de controller.
 *
 * Asserts:
 *   1) onboarding cria 1 row em subscriptions com status='trialing' e
 *      mp_preapproval_id setado.
 *   2) quando createPreapproval lança, NENHUM tenant/subscription é criado
 *      (rollback completo) e o request propaga o erro.
 */

import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { OnboardingController } from '../src/onboarding/onboarding.controller';
import type { MercadoPagoProvider } from '../src/payment/mercadopago.provider';
import type { TenantContextValue } from '../src/tenancy/tenant-context';
import { type CreateTenantOnboardingInput, type PlanTier, priceForTier } from '@barbearia/schemas';

const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────

function makeBody(suffix: string, tier: PlanTier = 'basic'): CreateTenantOnboardingInput {
  return {
    ownerCpf: '529.982.247-25', // CPF válido para testes
    tenant: {
      slug: `ob-${suffix}`,
      name: `Barbearia ${suffix}`,
      timezone: 'America/Sao_Paulo',
    },
    organization: { name: `Org ${suffix}` },
    location: {
      name: `Loc ${suffix}`,
      addressLine1: `Rua Teste, ${suffix}`,
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      country: 'BR',
    },
    barbershop: { name: `Shop ${suffix}`, lateCancelFeePct: 15 },
    tier,
    billingCycle: 'monthly',
    // Free não manda cartão; pagos mandam.
    ...(tier === 'free' ? {} : { cardTokenId: 'tok_test_abc' }),
  };
}

// Roda o controller dentro de uma transação do prisma, simulando o
// TenantInterceptor. A transação é abortada no afterAll via cleanup de
// prisma.tenant.deleteMany (cascade).
async function runInTx(
  userId: string,
  fn: (ctx: TenantContextValue) => Promise<unknown>,
): Promise<unknown> {
  return prisma.$transaction(async (tx) => {
    // Simula SET LOCAL ROLE app_user + GUCs mínimos p/ que $executeRaw funcione
    // com as políticas RLS. Em banco de teste somos neondb_owner (BYPASSRLS),
    // então as políticas não bloqueiam — mas o `set_config` precisa existir pra
    // não quebrar os SELECTs posteriores dentro do controller.
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    const ctx: TenantContextValue = { userId, tenantId: null, tx };
    return fn(ctx);
  });
}

// ── shared state ────────────────────────────────────────────────────────────

const createdTenants: string[] = [];

afterAll(async () => {
  if (createdTenants.length) {
    await prisma.tenant.deleteMany({ where: { id: { in: createdTenants } } });
  }
  await prisma.$disconnect();
});

// ── caso feliz ───────────────────────────────────────────────────────────────

describe('Onboarding — cria preapproval + Subscription (happy path)', () => {
  it('cria 1 row em subscriptions com status trialing e mp_preapproval_id setado', async () => {
    const userId = randomUUID();
    const userEmail = `ob-happy-${userId}@test.invalid`;

    await prisma.appUser.create({ data: { id: userId, email: userEmail } });

    const mpMock = {
      createPreapproval: jest.fn().mockResolvedValue({ id: 'pre_x', status: 'authorized' }),
      cancelPreapproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as MercadoPagoProvider;

    const controller = new OnboardingController(mpMock);
    const suffix = userId.slice(0, 8);
    const body = makeBody(suffix);

    let tenantId: string | undefined;

    const result = await runInTx(userId, async (ctx) => {
      const r = await controller.createTenant(ctx, body);
      tenantId = r.tenant.id;
      return r;
    }) as { tenant: { id: string } };

    createdTenants.push(result.tenant.id);

    // ── asserts de retorno ──
    expect(result.tenant.id).toBeTruthy();

    // ── asserts de DB ──
    const sub = await prisma.subscription.findUnique({
      where: { tenantId: result.tenant.id },
    });
    expect(sub).not.toBeNull();
    expect(sub!.tier).toBe('basic');
    expect(sub!.status).toBe('trialing');
    expect(sub!.mpPreapprovalId).toBe('pre_x');
    expect(sub!.priceCents).toBe(priceForTier('basic', 'monthly'));
    expect(sub!.billingCycle).toBe('monthly');
    expect(sub!.trialEndsAt).toBeInstanceOf(Date);

    // ── assert que o MP foi chamado ──
    expect(mpMock.createPreapproval).toHaveBeenCalledTimes(1);
    expect(mpMock.createPreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        payerEmail: userEmail,
        cardTokenId: 'tok_test_abc',
        amountCents: priceForTier('basic', 'monthly'),
        trialDays: 14,
      }),
    );

    // cleanup user
    await prisma.appUser.deleteMany({ where: { id: userId } });
  });
});

// ── tier Free: sem cartão, sem preapproval ───────────────────────────────────

describe('Onboarding — tier free não chama o MP e nasce active', () => {
  it('cria Subscription tier=free status=active sem preapproval, sem chamar createPreapproval', async () => {
    const userId = randomUUID();
    const userEmail = `ob-free-${userId}@test.invalid`;
    await prisma.appUser.create({ data: { id: userId, email: userEmail } });

    const mpMock = {
      createPreapproval: jest.fn().mockResolvedValue({ id: 'pre_never', status: 'authorized' }),
      cancelPreapproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as MercadoPagoProvider;

    const controller = new OnboardingController(mpMock);
    const suffix = `free${userId.slice(0, 7)}`;
    const body = makeBody(suffix, 'free');

    const result = (await runInTx(userId, (ctx) => controller.createTenant(ctx, body))) as {
      tenant: { id: string };
    };
    createdTenants.push(result.tenant.id);

    const sub = await prisma.subscription.findUnique({ where: { tenantId: result.tenant.id } });
    expect(sub).not.toBeNull();
    expect(sub!.tier).toBe('free');
    expect(sub!.status).toBe('active');
    expect(sub!.mpPreapprovalId).toBeNull();
    expect(sub!.priceCents).toBe(0);
    expect(sub!.trialEndsAt).toBeNull();
    expect(mpMock.createPreapproval).not.toHaveBeenCalled();

    await prisma.appUser.deleteMany({ where: { id: userId } });
  });
});

// ── falha do MP ──────────────────────────────────────────────────────────────

describe('Onboarding — createPreapproval falha → rollback total', () => {
  it('não cria tenant/subscription quando createPreapproval rejeita', async () => {
    const userId = randomUUID();
    const userEmail = `ob-fail-${userId}@test.invalid`;

    await prisma.appUser.create({ data: { id: userId, email: userEmail } });

    const mpMock = {
      createPreapproval: jest.fn().mockRejectedValue(new Error('MP recusou o cartão')),
      cancelPreapproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as MercadoPagoProvider;

    const controller = new OnboardingController(mpMock);
    const suffix = `f${userId.slice(0, 7)}`;
    const body = makeBody(suffix);

    await expect(
      runInTx(userId, (ctx) => controller.createTenant(ctx, body)),
    ).rejects.toThrow('MP recusou o cartão');

    // Nenhum tenant deve ter sido criado
    const tenants = await prisma.tenant.findMany({
      where: { slug: body.tenant.slug },
    });
    expect(tenants).toHaveLength(0);

    // Nenhuma subscription deve existir com esse slug
    // (verificação indireta — se não há tenant, não há subscription)
    const subs = await prisma.subscription.findMany({
      where: { tenant: { slug: body.tenant.slug } },
    });
    expect(subs).toHaveLength(0);

    // cleanup user
    await prisma.appUser.deleteMany({ where: { id: userId } });
  });
});

// ── missing email ────────────────────────────────────────────────────────────

describe('Onboarding — usuário sem email → BadRequestException antes de chamar MP', () => {
  it('lança BadRequestException e não chama createPreapproval quando email é null', async () => {
    const userId = randomUUID();

    // Cria user SEM email (email nullable no schema)
    await prisma.appUser.create({ data: { id: userId, email: null } });

    const mpMock = {
      createPreapproval: jest.fn().mockResolvedValue({ id: 'pre_never', status: 'authorized' }),
      cancelPreapproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as MercadoPagoProvider;

    const controller = new OnboardingController(mpMock);
    const suffix = `e${userId.slice(0, 7)}`;
    const body = makeBody(suffix);

    await expect(
      runInTx(userId, (ctx) => controller.createTenant(ctx, body)),
    ).rejects.toThrow(BadRequestException);

    // MP não deve ter sido chamado
    expect(mpMock.createPreapproval).not.toHaveBeenCalled();

    // cleanup user
    await prisma.appUser.deleteMany({ where: { id: userId } });
  });
});
