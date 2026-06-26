// Mock pg-boss-dependent modules (não inicializamos pg-boss neste teste).
jest.mock('../src/jobs/jobs.service', () => ({
  JobsService: jest.fn(),
}));

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { JobsWorkerService } from '../src/jobs/jobs-worker.service';

const prisma = new PrismaClient();

// Acesso ao método privado pro teste.
interface CleanupAccess {
  handlePendingTenantCleanup(): Promise<void>;
}

function makeWorker(): CleanupAccess {
  const stub = {} as never;
  // config.get sempre undefined → deleteSupabaseAuthUser é no-op (sem fetch).
  const config = { get: () => undefined } as never;
  const worker = new JobsWorkerService(stub, prisma as never, stub, config, stub, stub);
  return worker as unknown as CleanupAccess;
}

async function makeTenant(status: string, ageDays: number): Promise<string> {
  const id = randomUUID();
  await prisma.tenant.create({
    data: { id, slug: `cl-${id.slice(0, 8)}`, name: `Cleanup ${id.slice(0, 6)}`, status },
  });
  await prisma.$executeRaw`UPDATE tenants SET created_at = now() - (${ageDays} || ' days')::interval WHERE id = ${id}::uuid`;
  return id;
}

describe('handlePendingTenantCleanup', () => {
  const created: string[] = [];
  const users: string[] = [];

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: created } } });
    await prisma.appUser.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it('apaga só os tenants pending com > 3 dias; mantém active e pending recente', async () => {
    const oldPending = await makeTenant('pending', 4);
    const recentPending = await makeTenant('pending', 1);
    const oldActive = await makeTenant('active', 10);
    created.push(oldPending, recentPending, oldActive);

    // dono do oldPending (sem outras barbearias) deve ser apagado também.
    const ownerId = randomUUID();
    users.push(ownerId);
    await prisma.appUser.create({ data: { id: ownerId, email: `clown-${ownerId.slice(0, 6)}@t.invalid` } });
    await prisma.tenantMembership.create({ data: { userId: ownerId, tenantId: oldPending, roles: ['admin'] } });

    await makeWorker().handlePendingTenantCleanup();

    expect(await prisma.tenant.findUnique({ where: { id: oldPending } })).toBeNull();
    expect(await prisma.tenant.findUnique({ where: { id: recentPending } })).not.toBeNull();
    expect(await prisma.tenant.findUnique({ where: { id: oldActive } })).not.toBeNull();
    // dono sem barbearia restante → app_user apagado
    expect(await prisma.appUser.findUnique({ where: { id: ownerId } })).toBeNull();
  });
});
