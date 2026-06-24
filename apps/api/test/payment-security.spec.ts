// Mock pg-boss-dependent modules before any import resolves them (same pattern
// as cancel-fee.spec.ts). PaymentService only uses jobs for scheduleExpiration,
// which is best-effort; a no-op mock is safe here.
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

import { PaymentController } from '../src/payment/payment.controller';
import { PaymentService } from '../src/payment/payment.service';
import { MercadoPagoWebhookController } from '../src/payment/mercadopago-webhook.controller';
import { buildMpSignature } from '../src/payment/mercadopago-signature';
import { encodeCancelToken } from '../src/slots/cancel-token';

// Real PrismaClient against local test DB (loaded via setup-env.ts).
const prisma = new PrismaClient();

const WEBHOOK_SECRET = 'whsec_secfix_test';

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

function newPaymentService(): PaymentService {
  return new PaymentService(prisma as never, provider, mpStub, jobsStub, notifierStub);
}

// Minimal tenant tree + appointment + (optional) payment for a test case.
async function seedAppointment(opts: {
  amountCents: number;
  withPayment: boolean;
  providerPaymentId?: string;
  status?: string;
}): Promise<{ tenant: string; appt: string; user: string; customer?: string }> {
  const user = randomUUID();
  await prisma.appUser.create({ data: { id: user, email: `u-${user}@test.invalid` } });
  const tenant = (
    await prisma.tenant.create({ data: { slug: `sec-${user.slice(0, 8)}`, name: 'SEC' } })
  ).id;
  const org = (await prisma.organization.create({ data: { tenantId: tenant, name: 'O' } })).id;
  const loc = (
    await prisma.location.create({
      data: {
        tenantId: tenant,
        organizationId: org,
        name: 'L',
        addressLine1: 'R',
        city: 'C',
        state: 'SP',
        postalCode: '01000-000',
      },
    })
  ).id;
  const shop = (
    await prisma.barbershop.create({
      data: { tenantId: tenant, locationId: loc, name: 'S', lateCancelFeePct: 50 },
    })
  ).id;
  const svc = (
    await prisma.service.create({
      data: {
        tenantId: tenant,
        barbershopId: shop,
        name: 'Corte',
        durationMin: 30,
        basePriceCents: opts.amountCents,
      },
    })
  ).id;
  const barber = (
    await prisma.employee.create({
      data: { tenantId: tenant, barbershopId: shop, displayName: 'B', role: 'barber' },
    })
  ).id;
  const appt = (
    await prisma.appointment.create({
      data: {
        tenantId: tenant,
        barbershopId: shop,
        barberId: barber,
        serviceId: svc,
        customerName: 'X',
        customerEmail: `u-${user}@test.invalid`,
        startAt: new Date(Date.now() + 3_600_000),
        endAt: new Date(Date.now() + 5_400_000),
        priceCents: opts.amountCents,
        status: opts.status ?? 'awaiting_payment',
      },
    })
  ).id;
  if (opts.withPayment) {
    await prisma.payment.create({
      data: {
        tenantId: tenant,
        appointmentId: appt,
        method: 'pix',
        status: 'pending',
        amountCents: opts.amountCents,
        providerPaymentId: opts.providerPaymentId,
      },
    });
  }
  return { tenant, appt, user };
}

async function cleanup(tenant: string, user: string): Promise<void> {
  await prisma.tenant.deleteMany({ where: { id: tenant } });
  await prisma.appUser.deleteMany({ where: { id: user } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// C1 — markPaid must verify transaction_amount + currency against amountCents
// ---------------------------------------------------------------------------
describe('C1 — markPaid verifica valor e moeda (anti under-payment)', () => {
  it('NÃO marca pago quando transaction_amount diverge (R$0,01 vs R$30)', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: true,
      providerPaymentId: 'mp-c1-mismatch',
    });
    try {
      const service = newPaymentService();
      // Attacker-controlled MP object: trivial amount carrying the appointment.
      // The controller forwards transaction_amount/currency_id as `verified`.
      await service.markPaid(
        appt,
        {
          id: 'mp-c1-mismatch',
          status: 'approved',
          transaction_amount: 0.01,
          currency_id: 'BRL',
          external_reference: appt,
        },
        { transactionAmount: 0.01, currencyId: 'BRL' },
      );

      const pay = await prisma.payment.findUnique({
        where: { appointmentId: appt },
        select: { status: true },
      });
      const a = await prisma.appointment.findUnique({
        where: { id: appt },
        select: { status: true },
      });
      expect(pay?.status).not.toBe('paid');
      expect(a?.status).toBe('awaiting_payment');
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('NÃO marca pago quando a moeda não é BRL', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: true,
      providerPaymentId: 'mp-c1-currency',
    });
    try {
      const service = newPaymentService();
      await service.markPaid(
        appt,
        {
          id: 'mp-c1-currency',
          status: 'approved',
          transaction_amount: 30.0,
          currency_id: 'USD',
          external_reference: appt,
        },
        { transactionAmount: 30.0, currencyId: 'USD' },
      );

      const pay = await prisma.payment.findUnique({
        where: { appointmentId: appt },
        select: { status: true },
      });
      expect(pay?.status).not.toBe('paid');
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('marca pago quando valor (R$30,00 = 3000c) e moeda (BRL) batem', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: true,
      providerPaymentId: 'mp-c1-ok',
    });
    try {
      const service = newPaymentService();
      await service.markPaid(
        appt,
        {
          id: 'mp-c1-ok',
          status: 'approved',
          transaction_amount: 30.0,
          currency_id: 'BRL',
          external_reference: appt,
        },
        { transactionAmount: 30.0, currencyId: 'BRL' },
      );

      const pay = await prisma.payment.findUnique({
        where: { appointmentId: appt },
        select: { status: true },
      });
      const a = await prisma.appointment.findUnique({
        where: { id: appt },
        select: { status: true },
      });
      expect(pay?.status).toBe('paid');
      expect(a?.status).toBe('pending');
    } finally {
      await cleanup(tenant, user);
    }
  });
});

// ---------------------------------------------------------------------------
// C2 — webhook must require a local Payment keyed by providerPaymentId.
// A signed-but-forged webhook whose data.id has no local Payment must NOT
// confirm any appointment, even if external_reference points at a real one.
// ---------------------------------------------------------------------------
describe('C2 — webhook exige Payment local por providerPaymentId (anti foreign-payment)', () => {
  function buildController(getPaymentImpl: jest.Mock): {
    controller: MercadoPagoWebhookController;
    provider: { getPayment: jest.Mock };
  } {
    const config = {
      get: (k: string) => {
        if (k === 'MERCADOPAGO_WEBHOOK_SECRET') return WEBHOOK_SECRET;
        if (k === 'NODE_ENV') return 'test';
        return undefined;
      },
    } as never;
    const providerWebhook = { getPayment: getPaymentImpl } as never;
    const payments = newPaymentService();
    const idempotency = {
      isFirstProcessing: jest.fn().mockResolvedValue(true),
    } as never;
    const controller = new MercadoPagoWebhookController(
      config,
      providerWebhook,
      payments,
      prisma as never,
      idempotency,
    );
    return { controller, provider: providerWebhook as never };
  }

  function signedReq(dataId: string, reqId: string) {
    const ts = '1700000000';
    const xSignature = buildMpSignature({ secret: WEBHOOK_SECRET, dataId, xRequestId: reqId, ts });
    return { req: { body: { type: 'payment', data: { id: dataId } } } as never, xSignature };
  }

  it('webhook forjado (data.id sem Payment local) NÃO confirma o appointment vítima', async () => {
    // Victim appointment exists, awaiting payment, and has its OWN legit pending
    // Payment created by its real charge (providerPaymentId = 'mp-victim-real').
    // The attacker forges a webhook with a DIFFERENT data.id ('mp-forged-999')
    // whose external_reference points at the victim. With the bug, the controller
    // resolves the appointment from external_reference and confirms it; with the
    // fix, no local Payment matches data.id so it must no-op.
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: true,
      providerPaymentId: 'mp-victim-real',
    });
    try {
      const forgedDataId = 'mp-forged-999';
      // Attacker fabricates an approved MP payment whose external_reference is
      // the victim appointment and amount matches — but there is no local
      // Payment with providerPaymentId === forgedDataId.
      const getPayment = jest.fn().mockResolvedValue({
        id: forgedDataId,
        status: 'approved',
        transaction_amount: 30.0,
        currency_id: 'BRL',
        external_reference: appt,
      });
      const { controller } = buildController(getPayment);
      const { req, xSignature } = signedReq(forgedDataId, 'req-forged');

      await controller.handle(req, xSignature, 'req-forged', 'payment', forgedDataId);

      const a = await prisma.appointment.findUnique({
        where: { id: appt },
        select: { status: true },
      });
      const pay = await prisma.payment.findUnique({
        where: { appointmentId: appt },
        select: { status: true },
      });
      expect(a?.status).toBe('awaiting_payment'); // untouched
      expect(pay?.status).not.toBe('paid'); // forged payment must not confirm
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('webhook legítimo (Payment local existe) confirma o appointment', async () => {
    const dataId = 'mp-legit-123';
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: true,
      providerPaymentId: dataId,
    });
    try {
      const getPayment = jest.fn().mockResolvedValue({
        id: dataId,
        status: 'approved',
        transaction_amount: 30.0,
        currency_id: 'BRL',
        external_reference: appt,
      });
      const { controller } = buildController(getPayment);
      const { req, xSignature } = signedReq(dataId, 'req-legit');

      await controller.handle(req, xSignature, 'req-legit', 'payment', dataId);

      const a = await prisma.appointment.findUnique({
        where: { id: appt },
        select: { status: true },
      });
      const pay = await prisma.payment.findUnique({
        where: { appointmentId: appt },
        select: { status: true },
      });
      expect(pay?.status).toBe('paid');
      expect(a?.status).toBe('pending');
    } finally {
      await cleanup(tenant, user);
    }
  });
});

// ---------------------------------------------------------------------------
// H3 — Public pay endpoint must verify a possession token (HMAC cancel-token).
// Without a valid token the endpoint must reject (403); with a valid one it
// must proceed and charge.  Provider is mocked so no real money moves.
// ---------------------------------------------------------------------------
describe('H3 — POST /pay exige token de posse (anti-griefing)', () => {
  const CANCEL_SECRET = 'h3-test-cancel-secret-32charsplus';

  function buildPaymentController(chargeImpl: jest.Mock): PaymentController {
    const chargeProvider = {
      name: 'mock',
      charge: chargeImpl,
      refund: jest.fn().mockResolvedValue(undefined),
    } as never;
    const configStub = {
      get: (k: string) =>
        k === 'APPOINTMENT_CANCEL_SECRET' ? CANCEL_SECRET : undefined,
    } as never;
    const service = new PaymentService(
      prisma as never,
      chargeProvider,
      mpStub,
      jobsStub,
      notifierStub,
    );
    return new PaymentController(service, prisma as never, configStub);
  }

  it('rejeita (ForbiddenException) quando token está ausente', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: false,
    });
    try {
      const charge = jest.fn().mockResolvedValue({ status: 'paid', providerPaymentId: 'mock-h3-notoken', payload: {} });
      const ctrl = buildPaymentController(charge);

      // Token absent: send body without possessionToken (cast to bypass TS).
      await expect(
        ctrl.pay(appt, { method: 'pix', possessionToken: '' } as never),
      ).rejects.toMatchObject({ status: 403 });

      // Provider must NOT have been called.
      expect(charge).not.toHaveBeenCalled();
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('rejeita (ForbiddenException) quando token é inválido (assinatura errada)', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: false,
    });
    try {
      const charge = jest.fn().mockResolvedValue({ status: 'paid', providerPaymentId: 'mock-h3-badtoken', payload: {} });
      const ctrl = buildPaymentController(charge);

      const badToken = encodeCancelToken(
        { apptId: appt, exp: Math.floor(Date.now() / 1000) + 3600 },
        'wrong-secret-totally-different',
      );

      await expect(
        ctrl.pay(appt, { method: 'pix', possessionToken: badToken }),
      ).rejects.toMatchObject({ status: 403 });

      expect(charge).not.toHaveBeenCalled();
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('rejeita (ForbiddenException) quando token aponta para outro apptId', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: false,
    });
    try {
      const charge = jest.fn().mockResolvedValue({ status: 'paid', providerPaymentId: 'mock-h3-wrongid', payload: {} });
      const ctrl = buildPaymentController(charge);

      // Token signed for a DIFFERENT appointment UUID.
      const wrongIdToken = encodeCancelToken(
        { apptId: randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 },
        CANCEL_SECRET,
      );

      await expect(
        ctrl.pay(appt, { method: 'pix', possessionToken: wrongIdToken }),
      ).rejects.toMatchObject({ status: 403 });

      expect(charge).not.toHaveBeenCalled();
    } finally {
      await cleanup(tenant, user);
    }
  });

  it('autoriza e cobra quando token é válido e apptId bate', async () => {
    const { tenant, appt, user } = await seedAppointment({
      amountCents: 3000,
      withPayment: false,
    });
    try {
      const charge = jest.fn().mockResolvedValue({
        status: 'paid',
        providerPaymentId: `mock-h3-valid-${appt}`,
        payload: {},
      });
      const ctrl = buildPaymentController(charge);

      // Token signed with the correct secret and matching apptId.
      const validToken = encodeCancelToken(
        { apptId: appt, exp: Math.floor(Date.now() / 1000) + 3600 },
        CANCEL_SECRET,
      );

      const result = await ctrl.pay(appt, { method: 'pix', possessionToken: validToken });

      expect(result.payment).toBeDefined();
      expect(result.payment.status).toBe('paid');
      expect(charge).toHaveBeenCalledTimes(1);

      // Confirm DB state.
      const a = await prisma.appointment.findUnique({
        where: { id: appt },
        select: { status: true },
      });
      expect(a?.status).toBe('pending');
    } finally {
      await cleanup(tenant, user);
    }
  });
});
