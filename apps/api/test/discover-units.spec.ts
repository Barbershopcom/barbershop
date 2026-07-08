/**
 * Integration test — Discover lista UNIDADES (multi-unidade, spec 2026-07-07).
 * Tenant público com 2 unidades ativas vira 2 cards, cada um com slug e
 * endereço da própria unidade; unidade inativa não aparece.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { DiscoverController } from '../src/discover/discover.controller';
import type { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaClient();
const controller = new DiscoverController(prisma as unknown as PrismaService);

const suffix = randomUUID().slice(0, 8);
let tenantId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { slug: `dv-${suffix}`, name: `Descoberta ${suffix}`, listedPublicly: true },
  });
  tenantId = tenant.id;
  const org = await prisma.organization.create({ data: { tenantId, name: 'Org' } });
  const mkLoc = (name: string, addr: string, city: string) =>
    prisma.location.create({
      data: {
        tenantId,
        organizationId: org.id,
        name,
        addressLine1: addr,
        city,
        state: 'SP',
        postalCode: '01000-000',
        country: 'BR',
      },
    });
  const locA = await mkLoc('Centro', 'Rua Aurora, 120', 'São Paulo');
  const locB = await mkLoc('Norte', 'Av. Norte, 900', 'Guarulhos');

  const shopA = await prisma.barbershop.create({
    data: { tenantId, locationId: locA.id, name: 'Unidade Centro', slug: `dv-centro-${suffix}` },
  });
  await prisma.barbershop.create({
    data: { tenantId, locationId: locB.id, name: 'Unidade Norte', slug: `dv-norte-${suffix}` },
  });
  await prisma.barbershop.create({
    data: {
      tenantId,
      locationId: locB.id,
      name: 'Unidade Fechada',
      slug: `dv-fechada-${suffix}`,
      isActive: false,
    },
  });

  // serviço + barbeiro só na unidade Centro (pra validar agregados por unidade)
  await prisma.service.create({
    data: {
      tenantId,
      barbershopId: shopA.id,
      name: 'Corte',
      durationMin: 30,
      basePriceCents: 5000,
    },
  });
  await prisma.employee.create({
    data: { tenantId, barbershopId: shopA.id, displayName: 'B1', role: 'barber' },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe('DiscoverController — unidades', () => {
  it('lista 1 card por unidade ativa, com slug/endereço próprios', async () => {
    const items = await controller.list({ q: suffix } as never);
    const mine = items.filter((i) => i.slug.endsWith(suffix));

    expect(mine.map((i) => i.slug).sort()).toEqual([
      `dv-centro-${suffix}`,
      `dv-norte-${suffix}`,
    ]);

    const centro = mine.find((i) => i.slug === `dv-centro-${suffix}`)!;
    expect(centro.name).toBe('Unidade Centro');
    expect(centro.addressLine).toBe('Rua Aurora, 120 • São Paulo');
    expect(centro.priceFromCents).toBe(5000);
    expect(centro.employeeCount).toBe(1);

    const norte = mine.find((i) => i.slug === `dv-norte-${suffix}`)!;
    expect(norte.priceFromCents).toBeNull();
    expect(norte.employeeCount).toBe(0);
  });

  it('busca pelo nome da marca (tenant) encontra as unidades', async () => {
    const items = await controller.list({ q: `Descoberta ${suffix}` } as never);
    const mine = items.filter((i) => i.slug.endsWith(suffix));
    expect(mine).toHaveLength(2);
  });
});
