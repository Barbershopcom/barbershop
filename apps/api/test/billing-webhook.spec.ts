// Testes TDD para os tópicos de assinatura no MercadoPagoWebhookController.
// Segue o padrão de payment-security.spec.ts: controller construído manualmente,
// BillingService real (DB local), MercadoPagoProvider mockado.

// Mock pg-boss-dependent modules before any import resolves them (same pattern
// as payment-security.spec.ts). PaymentService only uses jobs for scheduleExpiration,
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

import { BillingService } from '../src/billing/billing.service';
import { buildMpSignature } from '../src/payment/mercadopago-signature';
import { MercadoPagoWebhookController } from '../src/payment/mercadopago-webhook.controller';

const prisma = new PrismaClient();

const WEBHOOK_SECRET = 'whsec_billing_test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cria um Tenant + Subscription trialing com mpPreapprovalId=preId. */
async function seedSubscription(preId: string): Promise<{ tenantId: string; subId: string }> {
  const tenantId = (
    await prisma.tenant.create({
      data: { slug: `bwh-${preId.slice(-8)}`, name: `BwhTest-${preId.slice(-6)}` },
    })
  ).id;

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const sub = await prisma.subscription.create({
    data: {
      tenantId,
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'trialing',
      priceCents: 9900,
      mpPreapprovalId: preId,
      trialEndsAt,
    },
  });

  return { tenantId, subId: sub.id };
}

async function cleanupTenant(tenantId: string): Promise<void> {
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null);
}

/** Monta o controller com BillingService real e provider mockado. */
function buildController(providerStub: {
  getPayment?: jest.Mock;
  getPreapproval?: jest.Mock;
}): MercadoPagoWebhookController {
  const config = {
    get: (k: string) => {
      if (k === 'MERCADOPAGO_WEBHOOK_SECRET') return WEBHOOK_SECRET;
      if (k === 'NODE_ENV') return 'test';
      return undefined;
    },
  } as never;

  const provider = {
    getPayment: providerStub.getPayment ?? jest.fn(),
    getPreapproval: providerStub.getPreapproval ?? jest.fn(),
  } as never;

  // PaymentService stub — subscription webhooks não tocam a rota de pagamento
  // de marketplace, então basta um stub mínimo.
  const paymentsStub = {
    markPaid: jest.fn(),
    markFailed: jest.fn(),
  } as never;

  const idempotency = {
    isFirstProcessing: jest.fn().mockResolvedValue(true),
  } as never;

  const billingService = new BillingService(prisma as never);

  return new MercadoPagoWebhookController(
    config,
    provider,
    paymentsStub,
    prisma as never,
    idempotency,
    billingService,
  );
}

/** Gera header x-signature válido + body de webhook. */
function signedEvent(opts: {
  dataId: string;
  reqId: string;
  eventType: string;
}): { req: never; xSignature: string; xRequestId: string } {
  const ts = '1700000000';
  const xSignature = buildMpSignature({
    secret: WEBHOOK_SECRET,
    dataId: opts.dataId,
    xRequestId: opts.reqId,
    ts,
  });
  const req = { body: { type: opts.eventType, data: { id: opts.dataId } } } as never;
  return { req, xSignature, xRequestId: opts.reqId };
}

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Teste 1: subscription_authorized_payment aprovado → status 'active'
// ---------------------------------------------------------------------------
describe('subscription_authorized_payment aprovado → active + currentPeriodEnd', () => {
  it('atualiza status da Subscription para active e seta currentPeriodEnd', async () => {
    const preId = `pre_${randomUUID().slice(0, 8)}`;
    const payId = `pay_${randomUUID().slice(0, 8)}`;
    const { tenantId, subId } = await seedSubscription(preId);

    try {
      const getPayment = jest.fn().mockResolvedValue({
        id: payId,
        status: 'approved',
        preapproval_id: preId,
      });

      const ctrl = buildController({ getPayment });
      const { req, xSignature, xRequestId } = signedEvent({
        dataId: payId,
        reqId: 'req-sub-pay',
        eventType: 'subscription_authorized_payment',
      });

      await ctrl.handle(req, xSignature, xRequestId, 'subscription_authorized_payment', payId);

      const sub = await prisma.subscription.findUnique({ where: { id: subId } });
      expect(sub?.status).toBe('active');
      expect(sub?.currentPeriodEnd).not.toBeNull();
    } finally {
      await cleanupTenant(tenantId);
    }
  });
});

// ---------------------------------------------------------------------------
// Teste 2: subscription_preapproval com status 'cancelled' → cancelled
// ---------------------------------------------------------------------------
describe('subscription_preapproval cancelled → status cancelled', () => {
  it('atualiza status da Subscription para cancelled', async () => {
    const preId = `pre_${randomUUID().slice(0, 8)}`;
    const { tenantId, subId } = await seedSubscription(preId);

    try {
      const getPreapproval = jest.fn().mockResolvedValue({
        id: preId,
        status: 'cancelled',
      });

      const ctrl = buildController({ getPreapproval });
      const { req, xSignature, xRequestId } = signedEvent({
        dataId: preId,
        reqId: 'req-pre-cancel',
        eventType: 'subscription_preapproval',
      });

      await ctrl.handle(req, xSignature, xRequestId, 'subscription_preapproval', preId);

      const sub = await prisma.subscription.findUnique({ where: { id: subId } });
      expect(sub?.status).toBe('cancelled');
    } finally {
      await cleanupTenant(tenantId);
    }
  });
});

// ---------------------------------------------------------------------------
// Teste 3: assinatura inválida → no-op, status inalterado
// ---------------------------------------------------------------------------
describe('x-signature inválida → no-op', () => {
  it('não altera a Subscription quando a assinatura é inválida', async () => {
    const preId = `pre_${randomUUID().slice(0, 8)}`;
    const payId = `pay_${randomUUID().slice(0, 8)}`;
    const { tenantId, subId } = await seedSubscription(preId);

    try {
      const getPayment = jest.fn().mockResolvedValue({
        id: payId,
        status: 'approved',
        preapproval_id: preId,
      });

      const ctrl = buildController({ getPayment });
      const req: never = { body: { type: 'subscription_authorized_payment', data: { id: payId } } } as never;
      const badSignature = 'ts=1700000000,v1=deadbeefdeadbeefdeadbeef';

      await ctrl.handle(req, badSignature, 'req-invalid-sig', 'subscription_authorized_payment', payId);

      const sub = await prisma.subscription.findUnique({ where: { id: subId } });
      expect(sub?.status).toBe('trialing'); // inalterado
    } finally {
      await cleanupTenant(tenantId);
    }
  });
});
