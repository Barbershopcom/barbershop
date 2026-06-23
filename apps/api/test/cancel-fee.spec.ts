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
import { MeCustomerAppointmentsController } from '../src/me/me-customer-appointments.controller';

// Real PrismaClient against local test DB (loaded via setup-env.ts).
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Shared stubs
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// MeCustomerAppointmentsController — cancel <24h e list preview
// ---------------------------------------------------------------------------
describe('MeCustomerAppointmentsController — cancel e list com multa', () => {
  const ids: {
    tenant?: string;
    org?: string;
    loc?: string;
    shop?: string;
    svc?: string;
    appt?: string;
    user?: string;
    barber?: string;
    customer?: string;
  } = {};

  let controller: MeCustomerAppointmentsController;

  beforeAll(async () => {
    ids.user = randomUUID();
    const userEmail = `u-${ids.user}@test.invalid`;

    await prisma.appUser.create({ data: { id: ids.user, email: userEmail } });

    ids.tenant = (
      await prisma.tenant.create({
        data: { slug: `cc-${ids.user.slice(0, 8)}`, name: 'CC' },
      })
    ).id;
    ids.org = (
      await prisma.organization.create({
        data: { tenantId: ids.tenant, name: 'O2' },
      })
    ).id;
    ids.loc = (
      await prisma.location.create({
        data: {
          tenantId: ids.tenant,
          organizationId: ids.org,
          name: 'L2',
          addressLine1: 'R2',
          city: 'C2',
          state: 'SP',
          postalCode: '01000-001',
        },
      })
    ).id;
    ids.shop = (
      await prisma.barbershop.create({
        data: {
          tenantId: ids.tenant,
          locationId: ids.loc,
          name: 'S2',
          lateCancelFeePct: 50,
        },
      })
    ).id;
    ids.svc = (
      await prisma.service.create({
        data: {
          tenantId: ids.tenant,
          barbershopId: ids.shop,
          name: 'Corte2',
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
          displayName: 'Barber CC',
          role: 'barber',
        },
      })
    ).id;
    ids.customer = (
      await prisma.customer.create({
        data: { appUserId: ids.user!, displayName: 'X' },
      })
    ).id;
    // startAt em +1h → dentro de 24h → isLate = true
    ids.appt = (
      await prisma.appointment.create({
        data: {
          tenantId: ids.tenant,
          barbershopId: ids.shop,
          barberId: ids.barber!,
          serviceId: ids.svc,
          customerId: ids.customer,
          customerName: 'X',
          customerEmail: userEmail,
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

    // Build controller with real prisma + stubbed deps
    const paymentService = new PaymentService(
      prisma as never,
      provider,
      mpStub,
      jobsStub,
      notifierStub,
    );
    const emailStub = { sendBookingCancelled: jest.fn().mockResolvedValue({ ok: true }) } as never;
    const customersStub = {
      ensureForUser: jest.fn().mockResolvedValue({ customerId: ids.customer, email: userEmail }),
    } as never;
    const couponsStub = { releaseReservation: jest.fn().mockResolvedValue(undefined) } as never;

    controller = new MeCustomerAppointmentsController(
      prisma as never,
      emailStub,
      customersStub,
      couponsStub,
      paymentService,
    );
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: ids.tenant } });
    await prisma.appUser.deleteMany({ where: { id: ids.user } });
    await prisma.customer.deleteMany({ where: { id: ids.customer } });
  });

  it('cancela <24h aplicando multa de 50% e reembolso parcial', async () => {
    const user = { id: ids.user!, email: `u-${ids.user}@test.invalid`, raw: {} };
    await controller.cancel(user as never, ids.appt!);

    const appt = await prisma.appointment.findUnique({
      where: { id: ids.appt! },
      select: { status: true },
    });
    const pay = await prisma.payment.findUnique({
      where: { appointmentId: ids.appt! },
      select: { status: true, cancelFeeCents: true },
    });

    expect(appt?.status).toBe('cancelled');
    expect(pay?.status).toBe('refunded');
    expect(pay?.cancelFeeCents).toBe(1500); // 50% de 3000
  });

  it('list retorna bloco cancellation em cada item', async () => {
    const user = { id: ids.user!, email: `u-${ids.user}@test.invalid`, raw: {} };
    const items = await controller.list(user as never);

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toHaveProperty('cancellation');
      expect(typeof item.cancellation.isLate).toBe('boolean');
      expect(typeof item.cancellation.feeCents).toBe('number');
      expect(typeof item.cancellation.refundCents).toBe('number');
      expect(item.cancellation.refundCents).toBeGreaterThanOrEqual(0);
    }
  });
});
