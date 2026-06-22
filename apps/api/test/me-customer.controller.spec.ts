/**
 * Integration test — MeCustomerController (perfil do cliente final).
 *
 * Valida os critérios da sprint de perfil:
 *  - GET cria o Customer sob demanda (ensureForUser) e é idempotente.
 *  - PATCH atualiza nome; PATCH parcial (só telefone) NÃO apaga o nome.
 *
 * Não é tenant-scoped: o controller usa o PrismaService global (bypassa RLS),
 * então instanciamos controller + service direto e batemos no DB de teste.
 * Account-linking de bookings guest fica no roteiro manual (exige fixture de
 * appointment completa — fora do valor deste teste).
 */

import { randomUUID } from 'node:crypto';

import type { AuthenticatedUser } from '../src/auth/auth.decorators';
import { CustomerService } from '../src/me/customer.service';
import { MeCustomerController } from '../src/me/me-customer.controller';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();
const customers = new CustomerService(prisma);
const controller = new MeCustomerController(prisma, customers);

const userId = randomUUID();
const user: AuthenticatedUser = {
  id: userId,
  email: `cust-${userId}@test.invalid`,
  raw: {},
};

beforeAll(async () => {
  // app_user é FK do customer — cria explicitamente (evita o retry-path do service).
  await prisma.appUser.create({ data: { id: userId, email: user.email } });
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { appUserId: userId } });
  await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('MeCustomerController', () => {
  let createdId: string;

  it('GET cria o Customer sob demanda e retorna o perfil', async () => {
    const profile = await controller.get(user);
    createdId = profile.id;

    expect(profile.id).toBeTruthy();
    expect(profile.email).toBe(user.email);
    expect(profile.displayName.length).toBeGreaterThanOrEqual(1);
    expect(profile.completedCutsCount).toBe(0);
  });

  it('GET é idempotente (não cria um segundo Customer)', async () => {
    const again = await controller.get(user);
    expect(again.id).toBe(createdId);
  });

  it('PATCH atualiza o nome', async () => {
    const updated = await controller.update(user, { displayName: 'Maria Teste' });
    expect(updated.displayName).toBe('Maria Teste');
    expect(updated.id).toBe(createdId);
  });

  it('PATCH parcial (só telefone) não apaga o nome', async () => {
    const updated = await controller.update(user, { phoneE164: '+5511999998888' });
    expect(updated.phoneE164).toBe('+5511999998888');
    expect(updated.displayName).toBe('Maria Teste');
  });
});
