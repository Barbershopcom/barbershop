// Mock pg-boss-dependent modules before any import resolves them.
// JobsService and JobsWorkerService import pg-boss (ESM) which jest can't
// parse in CommonJS mode. PaymentService only uses jobs for scheduleExpiration
// (not called by refund), so a no-op mock is safe here.
jest.mock('../src/jobs/jobs.service', () => ({
  JobsService: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  APPOINTMENT_EXPIRATION_QUEUE: 'appointment_expiration',
}));
jest.mock('../src/jobs/jobs-worker.service', () => ({
  JobsWorkerService: jest.fn(),
  APPOINTMENT_EXPIRATION_QUEUE: 'appointment_expiration',
}));

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PaymentService } from '../src/payment/payment.service';

// Real PrismaClient against local test DB (loaded via setup-env.ts).
const prisma = new PrismaClient();

describe('PaymentService.refund com multa', () => {
  const ids: {
    tenant?: string;
    org?: string;
    loc?: string;
    shop?: string;
    svc?: string;
    appt?: string;
    user?: string;
    barber?: string;
  } = {};

  beforeAll(async () => {
    ids.user = randomUUID();
    await prisma.appUser.create({
      data: { id: ids.user, email: `u-${ids.user}@test.invalid` },
    });
    ids.tenant = (
      await prisma.tenant.create({
        data: { slug: `cf-${ids.user.slice(0, 8)}`, name: 'CF' },
      })
    ).id;
    ids.org = (
      await prisma.organization.create({
        data: { tenantId: ids.tenant, name: 'O' },
      })
    ).id;
    ids.loc = (
      await prisma.location.create({
        data: {
          tenantId: ids.tenant,
          organizationId: ids.org,
          name: 'L',
          addressLine1: 'R',
          city: 'C',
          state: 'SP',
          postalCode: '01000-000',
        },
      })
    ).id;
    ids.shop = (
      await prisma.barbershop.create({
        data: {
          tenantId: ids.tenant,
          locationId: ids.loc,
          name: 'S',
          lateCancelFeePct: 50,
        },
      })
    ).id;
    ids.svc = (
      await prisma.service.create({
        data: {
          tenantId: ids.tenant,
          barbershopId: ids.shop,
          name: 'Corte',
          durationMin: 30,
          basePriceCents: 3000,
        },
      })
    ).id;
    ids.barber = (
      await prisma.employee.create({
        data: {
          tenantId: ids.tenant,
          barbershopId: ids.shop,
          displayName: 'Barber CF',
          role: 'barber',
        },
      })
    ).id;
    ids.appt = (
      await prisma.appointment.create({
        data: {
          tenantId: ids.tenant,
          barbershopId: ids.shop,
          barberId: ids.barber!,
          serviceId: ids.svc,
          customerName: 'X',
          customerEmail: `u-${ids.user}@test.invalid`,
          startAt: new Date(Date.now() + 3_600_000),
          endAt: new Date(Date.now() + 5_400_000),
          priceCents: 3000,
          status: 'pending',
        },
      })
    ).id;
    await prisma.payment.create({
      data: {
        tenantId: ids.tenant,
        appointmentId: ids.appt,
        method: 'pix',
        status: 'paid',
        amountCents: 3000,
        paidAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: ids.tenant } });
    await prisma.appUser.deleteMany({ where: { id: ids.user } });
    await prisma.$disconnect();
  });

  it('refund com feeCents grava cancelFeeCents e marca refunded', async () => {
    // PaymentService constructor: (prisma, provider, mp, jobs, notifier)
    // refund() only uses prisma and provider (and mp indirectly via getValidSellerToken).
    // Stubs for the unused deps (mp, jobs, notifier).
    const provider = {
      name: 'mock',
      charge: jest.fn(),
      refund: jest.fn().mockResolvedValue(undefined),
    } as never;
    const mpStub = { refreshOAuthToken: jest.fn() } as never;
    const jobsStub = { send: jest.fn() } as never;
    const notifierStub = {
      notifyPaymentReceived: jest.fn(),
      notifyNewPending: jest.fn(),
    } as never;

    const service = new PaymentService(
      prisma as never,
      provider,
      mpStub,
      jobsStub,
      notifierStub,
    );

    await service.refund(ids.appt!, 1500);

    const p = await prisma.payment.findUnique({
      where: { appointmentId: ids.appt! },
      select: { status: true, cancelFeeCents: true, refundedAt: true },
    });
    expect(p?.status).toBe('refunded');
    expect(p?.cancelFeeCents).toBe(1500);
    expect(p?.refundedAt).not.toBeNull();
  });
});
