/**
 * Integration test — RLS tenant isolation.
 *
 * Garante que SET LOCAL ROLE app_user + GUCs (app.user_id, app.tenant_id)
 * realmente filtram dados por tenant. Este é o seguro contra o pior bug
 * possível de um SaaS multi-tenant: vazamento de dados entre clientes.
 *
 * Setup: conecta como neondb_owner (BYPASSRLS=true) para criar fixtures.
 * Asserts: cada query roda em transação com `SET LOCAL ROLE app_user`
 * (NOBYPASSRLS), então as policies se aplicam.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

// IDs fixos por execução — gerados uma vez, limpos no afterAll.
const userA = randomUUID();
const userB = randomUUID();
let tenantA: string;
let tenantB: string;
let orgA: string;
let orgB: string;
let locA: string;
let locB: string;
let shopA: string;
let shopB: string;

beforeAll(async () => {
  // Setup como neondb_owner (BYPASSRLS) — popula 2 tenants isolados.
  await prisma.appUser.createMany({
    data: [
      { id: userA, email: `user-a-${userA}@test.invalid` },
      { id: userB, email: `user-b-${userB}@test.invalid` },
    ],
    skipDuplicates: true,
  });

  // Tenant A + cadeia completa + 2 serviços
  tenantA = (await prisma.tenant.create({ data: { slug: `t-a-${userA.slice(0, 8)}`, name: 'Tenant A' } })).id;
  orgA = (await prisma.organization.create({ data: { tenantId: tenantA, name: 'Org A' } })).id;
  locA = (await prisma.location.create({
    data: {
      tenantId: tenantA,
      organizationId: orgA,
      name: 'Loc A',
      addressLine1: 'Rua A, 1',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
    },
  })).id;
  shopA = (await prisma.barbershop.create({
    data: { tenantId: tenantA, locationId: locA, name: 'Shop A', slug: `shop-a-${userA.slice(0, 8)}` },
  })).id;
  await prisma.service.createMany({
    data: [
      { tenantId: tenantA, barbershopId: shopA, name: 'A1 Corte', durationMin: 30, basePriceCents: 5000 },
      { tenantId: tenantA, barbershopId: shopA, name: 'A2 Barba', durationMin: 20, basePriceCents: 3000 },
    ],
  });
  await prisma.tenantMembership.create({
    data: { userId: userA, tenantId: tenantA, roles: ['admin'] },
  });

  // Tenant B
  tenantB = (await prisma.tenant.create({ data: { slug: `t-b-${userB.slice(0, 8)}`, name: 'Tenant B' } })).id;
  orgB = (await prisma.organization.create({ data: { tenantId: tenantB, name: 'Org B' } })).id;
  locB = (await prisma.location.create({
    data: {
      tenantId: tenantB,
      organizationId: orgB,
      name: 'Loc B',
      addressLine1: 'Rua B, 2',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '20000-000',
    },
  })).id;
  shopB = (await prisma.barbershop.create({
    data: { tenantId: tenantB, locationId: locB, name: 'Shop B', slug: `shop-b-${userB.slice(0, 8)}` },
  })).id;
  await prisma.service.createMany({
    data: [
      { tenantId: tenantB, barbershopId: shopB, name: 'B1 Sobrancelha', durationMin: 15, basePriceCents: 2000 },
      { tenantId: tenantB, barbershopId: shopB, name: 'B2 Hidratação', durationMin: 40, basePriceCents: 8000 },
    ],
  });
  await prisma.tenantMembership.create({
    data: { userId: userB, tenantId: tenantB, roles: ['admin'] },
  });
});

afterAll(async () => {
  // Cleanup (ON DELETE CASCADE limpa a cadeia)
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.appUser.deleteMany({ where: { id: { in: [userA, userB] } } });
  await prisma.$disconnect();
});

/** Helper: roda fn dentro de tx com SET LOCAL ROLE app_user + GUCs. */
async function asUser<T>(
  userId: string,
  tenantId: string | null,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    if (tenantId) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    return fn(tx);
  });
}

describe('RLS tenant isolation', () => {
  it('sem GUCs setados, services retornam 0 (deny-by-default)', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
      const services = await tx.service.findMany();
      expect(services).toEqual([]);
    });
  });

  it('user A em contexto correto vê APENAS services do tenant A', async () => {
    await asUser(userA, tenantA, async (tx) => {
      const services = await tx.service.findMany();
      expect(services).toHaveLength(2);
      expect(services.every((s) => s.tenantId === tenantA)).toBe(true);
      expect(services.map((s) => s.name).sort()).toEqual(['A1 Corte', 'A2 Barba']);
    });
  });

  it('user A vê APENAS sua própria membership (não a do user B)', async () => {
    await asUser(userA, null, async (tx) => {
      const memberships = await tx.tenantMembership.findMany();
      expect(memberships).toHaveLength(1);
      expect(memberships[0]?.userId).toBe(userA);
      expect(memberships[0]?.tenantId).toBe(tenantA);
    });
  });

  it('user A vê APENAS o tenant em que tem membership (não vê tenant B)', async () => {
    await asUser(userA, null, async (tx) => {
      const tenants = await tx.tenant.findMany();
      expect(tenants.map((t) => t.id)).toEqual([tenantA]);
      expect(tenants.map((t) => t.id)).not.toContain(tenantB);
    });
  });

  it('user A setando app.tenant_id=B AINDA não consegue ver tenant B (policy de membership)', async () => {
    // Cenário de ataque: app bugada/maliciosa seta GUC errado.
    // Policy em tenants usa subquery em tenant_memberships filtrada por app.user_id,
    // então mesmo setando tenant_id=B, .tenant.findMany() continua isolado.
    await asUser(userA, tenantB, async (tx) => {
      const tenants = await tx.tenant.findMany();
      expect(tenants.map((t) => t.id)).not.toContain(tenantB);
    });
  });

  it('user A NÃO consegue inserir tenant_membership do user B (WITH CHECK)', async () => {
    await expect(
      asUser(userA, null, async (tx) => {
        return tx.tenantMembership.create({
          data: { userId: userB, tenantId: tenantA, roles: ['admin'] },
        });
      }),
    ).rejects.toThrow();
  });
});
