/**
 * Integration test — AdminServicesController (CRUD canônico de serviços).
 *
 * Valida os critérios de aceite do Product pós-centralização:
 *  - #1 Autorização: escrita exige role admin (assertTenantAdmin → 403 p/ barbeiro
 *       e p/ não-membro).
 *  - #2 Isolamento entre tenants: admin do tenant A não lê, edita nem desativa
 *       serviço do tenant B (RLS → 404, dados de B intactos).
 *  - #7 Happy path admin: criar → listar → editar.
 *  - #8 Soft delete: DELETE marca isActive=false, NÃO remove a linha.
 *
 * Estratégia: instanciamos o controller REAL e chamamos seus métodos passando
 * um TenantContextValue produzido dentro de uma transação com
 * `SET LOCAL ROLE app_user` + GUCs (igual ao que o TenantInterceptor faz em
 * produção). Assim exercitamos a lógica de verdade — role-check, soft delete e
 * RLS — sem subir HTTP/auth. Fixtures criadas como neondb_owner (BYPASSRLS).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { AdminServicesController } from '../src/admin/admin-services.controller';
import type { AuthenticatedUser } from '../src/auth/auth.decorators';
import type { TenantContextValue } from '../src/tenancy/tenant-context';

const prisma = new PrismaClient();
const controller = new AdminServicesController();

// Atores
const adminA = randomUUID();
const barberA = randomUUID(); // membership role 'barber' no tenant A
const outsider = randomUUID(); // sem membership em lugar nenhum
const adminB = randomUUID();

let tenantA: string;
let tenantB: string;
let shopA: string;
let shopB: string;
let serviceB: string; // serviço do tenant B, alvo das tentativas cross-tenant

async function seedTenant(label: string, adminUser: string) {
  const tenant = await prisma.tenant.create({
    data: { slug: `svc-${label}-${randomUUID().slice(0, 8)}`, name: `Tenant ${label}` },
  });
  const org = await prisma.organization.create({
    data: { tenantId: tenant.id, name: `Org ${label}` },
  });
  const loc = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      organizationId: org.id,
      name: `Loc ${label}`,
      addressLine1: `Rua ${label}, 1`,
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
    },
  });
  const shop = await prisma.barbershop.create({
    data: {
      tenantId: tenant.id,
      locationId: loc.id,
      name: `Shop ${label}`,
      slug: `shop-${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.tenantMembership.create({
    data: { userId: adminUser, tenantId: tenant.id, roles: ['admin'] },
  });
  return { tenantId: tenant.id, shopId: shop.id };
}

beforeAll(async () => {
  await prisma.appUser.createMany({
    data: [
      { id: adminA, email: `admin-a-${adminA}@test.invalid` },
      { id: barberA, email: `barber-a-${barberA}@test.invalid` },
      { id: outsider, email: `outsider-${outsider}@test.invalid` },
      { id: adminB, email: `admin-b-${adminB}@test.invalid` },
    ],
    skipDuplicates: true,
  });

  ({ tenantId: tenantA, shopId: shopA } = await seedTenant('A', adminA));
  ({ tenantId: tenantB, shopId: shopB } = await seedTenant('B', adminB));

  // barbeiro comum no tenant A (membership SEM 'admin')
  await prisma.tenantMembership.create({
    data: { userId: barberA, tenantId: tenantA, roles: ['barber'] },
  });

  // serviço já existente no tenant B, alvo das tentativas de ataque cross-tenant
  serviceB = (
    await prisma.service.create({
      data: {
        tenantId: tenantB,
        barbershopId: shopB,
        name: 'B-Original',
        durationMin: 30,
        basePriceCents: 4000,
        isActive: true,
      },
    })
  ).id;
});

afterAll(async () => {
  // Defensivo: se o beforeAll falhou antes de popular (ex.: DB indisponível),
  // tenantA/tenantB ficam undefined — filtra pra não estourar erro secundário.
  const tenantIds = [tenantA, tenantB].filter((id): id is string => Boolean(id));
  if (tenantIds.length > 0) {
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  await prisma.appUser.deleteMany({
    where: { id: { in: [adminA, barberA, outsider, adminB] } },
  });
  await prisma.$disconnect();
});

/**
 * Roda fn com um TenantContextValue real dentro de uma tx app_user + GUCs.
 * A transação commita no sucesso (inserts persistem) e dá rollback se fn lançar.
 */
async function withCtx<T>(
  userId: string,
  tenantId: string | null,
  fn: (ctx: TenantContextValue, user: AuthenticatedUser) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    if (tenantId) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    const ctx: TenantContextValue = { userId, tenantId: tenantId ?? null, tx };
    const user: AuthenticatedUser = {
      id: userId,
      email: `${userId}@test.invalid`,
      raw: {},
    };
    return fn(ctx, user);
  });
}

const validBody = {
  name: 'Corte Teste',
  durationMin: 30,
  bufferMin: 0,
  basePriceCents: 5000,
  isActive: true,
} as const;

describe('AdminServicesController — autorização (#1)', () => {
  it('barbeiro comum (role barber) recebe 403 ao CRIAR serviço', async () => {
    await expect(
      withCtx(barberA, tenantA, (ctx, user) => controller.create(ctx, user, { ...validBody })),
    ).rejects.toThrow(/admin/i);
  });

  it('barbeiro comum recebe 403 ao ATUALIZAR serviço', async () => {
    await expect(
      withCtx(barberA, tenantA, (ctx, user) =>
        controller.update(ctx, user, serviceB, { name: 'x' }),
      ),
    ).rejects.toThrow(/admin/i);
  });

  it('barbeiro comum recebe 403 ao DESATIVAR serviço', async () => {
    await expect(
      withCtx(barberA, tenantA, (ctx, user) => controller.deactivate(ctx, user, serviceB)),
    ).rejects.toThrow(/admin/i);
  });

  it('usuário sem membership no tenant recebe 403 (não vinculado)', async () => {
    await expect(
      withCtx(outsider, tenantA, (ctx, user) => controller.create(ctx, user, { ...validBody })),
    ).rejects.toThrow(/vinculado|admin/i);
  });
});

describe('AdminServicesController — happy path admin (#7) + soft delete (#8)', () => {
  let createdId: string;

  it('admin cria serviço (ativo, com barbershopId do tenant)', async () => {
    const created = await withCtx(adminA, tenantA, (ctx, user) =>
      controller.create(ctx, user, { ...validBody, name: 'Corte Premium' }),
    );
    createdId = created.id;
    expect(created.isActive).toBe(true);
    expect(created.barbershopId).toBe(shopA);
    expect(created.name).toBe('Corte Premium');
  });

  it('admin lista e enxerga o serviço recém-criado', async () => {
    const list = await withCtx(adminA, tenantA, (ctx, user) => controller.list(ctx, user));
    expect(list.some((s) => s.id === createdId)).toBe(true);
  });

  it('admin edita o serviço (PATCH parcial)', async () => {
    const updated = await withCtx(adminA, tenantA, (ctx, user) =>
      controller.update(ctx, user, createdId, { basePriceCents: 7777 }),
    );
    expect(updated.basePriceCents).toBe(7777);
    expect(updated.name).toBe('Corte Premium'); // inalterado
  });

  it('DELETE é SOFT: linha continua existindo com isActive=false', async () => {
    await withCtx(adminA, tenantA, (ctx, user) => controller.deactivate(ctx, user, createdId));

    // includeInactive=true → linha ainda está lá, desativada
    const all = await withCtx(adminA, tenantA, (ctx, user) => controller.list(ctx, user, 'true'));
    const row = all.find((s) => s.id === createdId);
    expect(row).toBeDefined();
    expect(row?.isActive).toBe(false);

    // lista default (só ativos) NÃO traz o desativado
    const activeOnly = await withCtx(adminA, tenantA, (ctx, user) => controller.list(ctx, user));
    expect(activeOnly.find((s) => s.id === createdId)).toBeUndefined();
  });
});

describe('AdminServicesController — isolamento entre tenants (#2)', () => {
  it('admin do tenant A NÃO vê serviços do tenant B na listagem', async () => {
    const list = await withCtx(adminA, tenantA, (ctx, user) => controller.list(ctx, user, 'true'));
    expect(list.every((s) => s.barbershopId === shopA)).toBe(true);
    expect(list.some((s) => s.id === serviceB)).toBe(false);
  });

  it('admin do tenant A NÃO consegue EDITAR serviço do tenant B (404, B intacto)', async () => {
    await expect(
      withCtx(adminA, tenantA, (ctx, user) =>
        controller.update(ctx, user, serviceB, { name: 'HACKED', basePriceCents: 1 }),
      ),
    ).rejects.toThrow(/não encontrado/i);

    // Conferido pela ótica do admin B: nada mudou.
    const bList = await withCtx(adminB, tenantB, (ctx, user) => controller.list(ctx, user, 'true'));
    const b = bList.find((s) => s.id === serviceB);
    expect(b?.name).toBe('B-Original');
    expect(b?.basePriceCents).toBe(4000);
  });

  it('admin do tenant A NÃO consegue DESATIVAR serviço do tenant B (404, B segue ativo)', async () => {
    await expect(
      withCtx(adminA, tenantA, (ctx, user) => controller.deactivate(ctx, user, serviceB)),
    ).rejects.toThrow(/não encontrado/i);

    const bList = await withCtx(adminB, tenantB, (ctx, user) => controller.list(ctx, user, 'true'));
    expect(bList.find((s) => s.id === serviceB)?.isActive).toBe(true);
  });
});

describe('AdminServicesController — escopo por unidade (multi-unidade)', () => {
  it('list/create com ?barbershopId separa serviços por unidade', async () => {
    // 2ª unidade no tenant A
    const loc2 = await prisma.location.create({
      data: {
        tenantId: tenantA,
        organizationId: (await prisma.organization.findFirstOrThrow({
          where: { tenantId: tenantA },
          select: { id: true },
        })).id,
        name: 'Loc A2',
        addressLine1: 'Rua A2, 2',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000-000',
      },
    });
    const shopA2 = (
      await prisma.barbershop.create({
        data: {
          tenantId: tenantA,
          locationId: loc2.id,
          name: 'Shop A2',
          slug: `shop-${randomUUID().slice(0, 8)}`,
        },
      })
    ).id;

    // cria um serviço em cada unidade via controller
    await withCtx(adminA, tenantA, (ctx, user) =>
      controller.create(
        ctx,
        user,
        { name: 'Corte A1', durationMin: 30, bufferMin: 0, basePriceCents: 5000, isActive: true },
        shopA,
      ),
    );
    await withCtx(adminA, tenantA, (ctx, user) =>
      controller.create(
        ctx,
        user,
        { name: 'Corte A2', durationMin: 30, bufferMin: 0, basePriceCents: 6000, isActive: true },
        shopA2,
      ),
    );

    const listA1 = await withCtx(adminA, tenantA, (ctx, user) =>
      controller.list(ctx, user, 'true', shopA),
    );
    const listA2 = await withCtx(adminA, tenantA, (ctx, user) =>
      controller.list(ctx, user, 'true', shopA2),
    );
    expect(listA1.some((s) => s.name === 'Corte A1')).toBe(true);
    expect(listA1.some((s) => s.name === 'Corte A2')).toBe(false);
    expect(listA2.some((s) => s.name === 'Corte A2')).toBe(true);
    expect(listA2.some((s) => s.name === 'Corte A1')).toBe(false);

    // sem barbershopId cai na 1ª unidade ativa (shopA)
    const listDefault = await withCtx(adminA, tenantA, (ctx, user) =>
      controller.list(ctx, user, 'true'),
    );
    expect(listDefault.some((s) => s.name === 'Corte A1')).toBe(true);
    expect(listDefault.some((s) => s.name === 'Corte A2')).toBe(false);
  });
});
