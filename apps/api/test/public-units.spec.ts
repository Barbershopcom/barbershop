/**
 * Integration test — resolução pública dual de slug (multi-unidade).
 *
 * resolvePublicTarget(slug):
 *  - slug de unidade ativa → { tenant, barbershop } daquela unidade
 *  - slug de tenant com 1 unidade ativa → resolve direto pra ela
 *  - slug de tenant com várias ativas → modo seletor ({ barbershop: null, units })
 *  - slug inexistente ou de unidade inativa → 404
 */

import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../src/prisma/prisma.service';
import { SlotsRepository } from '../src/slots/slots.repository';

const prisma = new PrismaClient();
const repo = new SlotsRepository(prisma as unknown as PrismaService);

const suffix = randomUUID().slice(0, 8);

let multiTenantId: string;
let monoTenantId: string;
let unitAId: string;

async function seed(slug: string, name: string) {
  const tenant = await prisma.tenant.create({ data: { slug, name } });
  const org = await prisma.organization.create({ data: { tenantId: tenant.id, name: 'Org' } });
  const loc = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      organizationId: org.id,
      name: 'Loc',
      addressLine1: 'Rua P, 1',
      city: 'SP',
      state: 'SP',
      postalCode: '01000-000',
      country: 'BR',
    },
  });
  return { tenant, org, loc };
}

beforeAll(async () => {
  // Tenant multi-unidade: slug do tenant NÃO é slug de nenhuma unidade
  // (cenário pós-criação de 2ª unidade com slugs próprios).
  const multi = await seed(`pu-multi-${suffix}`, 'Multi');
  multiTenantId = multi.tenant.id;
  unitAId = (
    await prisma.barbershop.create({
      data: {
        tenantId: multiTenantId,
        locationId: multi.loc.id,
        name: 'Unidade A',
        slug: `pu-unit-a-${suffix}`,
      },
    })
  ).id;
  await prisma.barbershop.create({
    data: {
      tenantId: multiTenantId,
      locationId: multi.loc.id,
      name: 'Unidade B',
      slug: `pu-unit-b-${suffix}`,
    },
  });
  await prisma.barbershop.create({
    data: {
      tenantId: multiTenantId,
      locationId: multi.loc.id,
      name: 'Unidade C (inativa)',
      slug: `pu-unit-c-${suffix}`,
      isActive: false,
    },
  });

  // Tenant mono-unidade: unidade herdou o slug do tenant (cenário backfill).
  const mono = await seed(`pu-mono-${suffix}`, 'Mono');
  monoTenantId = mono.tenant.id;
  await prisma.barbershop.create({
    data: {
      tenantId: monoTenantId,
      locationId: mono.loc.id,
      name: 'Única',
      slug: `pu-mono-${suffix}`,
    },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [multiTenantId, monoTenantId] } } });
  await prisma.$disconnect();
});

describe('resolvePublicTarget', () => {
  it('slug de unidade ativa resolve tenant + barbershop', async () => {
    const t = await repo.resolvePublicTarget(`pu-unit-a-${suffix}`);
    expect(t.tenant.id).toBe(multiTenantId);
    expect(t.barbershop).toMatchObject({ id: unitAId, slug: `pu-unit-a-${suffix}` });
    expect(t.units).toEqual([]);
  });

  it('slug de tenant com várias unidades ativas → modo seletor', async () => {
    const t = await repo.resolvePublicTarget(`pu-multi-${suffix}`);
    expect(t.tenant.id).toBe(multiTenantId);
    expect(t.barbershop).toBeNull();
    expect(t.units.map((u) => u.slug).sort()).toEqual([
      `pu-unit-a-${suffix}`,
      `pu-unit-b-${suffix}`,
    ]);
  });

  it('slug de tenant mono-unidade resolve direto pra unidade', async () => {
    const t = await repo.resolvePublicTarget(`pu-mono-${suffix}`);
    expect(t.tenant.id).toBe(monoTenantId);
    expect(t.barbershop).toMatchObject({ slug: `pu-mono-${suffix}`, name: 'Única' });
  });

  it('slug inexistente → 404; unidade inativa via slug próprio → 404', async () => {
    await expect(repo.resolvePublicTarget(`nao-existe-${suffix}`)).rejects.toThrow(
      NotFoundException,
    );
    await expect(repo.resolvePublicTarget(`pu-unit-c-${suffix}`)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('resolveTenant continua funcionando (wrapper de compat)', async () => {
    const tenant = await repo.resolveTenant(`pu-mono-${suffix}`);
    expect(tenant.id).toBe(monoTenantId);
    // e via slug de unidade também resolve o tenant dono
    const viaUnit = await repo.resolveTenant(`pu-unit-b-${suffix}`);
    expect(viaUnit.id).toBe(multiTenantId);
  });
});
