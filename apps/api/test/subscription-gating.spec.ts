// Mock pg-boss-dependent modules before any import resolves them.
jest.mock('../src/jobs/jobs.service', () => ({
  JobsService: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  APPOINTMENT_EXPIRATION_QUEUE: 'appointment_expiration',
}));
jest.mock('../src/jobs/jobs-worker.service', () => ({
  JobsWorkerService: jest.fn(),
  APPOINTMENT_EXPIRATION_QUEUE: 'appointment_expiration',
}));

/**
 * subscription-gating.spec.ts
 *
 * Strategy: unit-test at service level, mocking repo + deps.
 *
 * Rationale: a full DB booking requires tenant + service + barber + schedule +
 * BarbershopHours rows plus SlotsService.compute to return a matching slot —
 * heavily coupled to business logic unrelated to the gate.  The gate fires
 * BEFORE any of that (right after resolveTenant), so mocking
 * repo.resolveTenant and repo.getSubscriptionStatus is sufficient to exercise
 * the gate path in isolation, with deterministic results and no DB dependency.
 */

import { ForbiddenException } from '@nestjs/common';
import { BookingService } from '../src/slots/booking.service';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-uuid-1234';
const TENANT_SLUG = 'minha-barbearia';

const fakeTenant = {
  id: TENANT_ID,
  slug: TENANT_SLUG,
  name: 'Minha Barbearia',
  timezone: 'America/Sao_Paulo',
  status: 'active',
  phoneE164: null,
  addressLine: null,
  instagramHandle: null,
};

interface RepoStub {
  resolveTenant: jest.Mock;
  resolvePublicTarget: jest.Mock;
  getSubscriptionStatus: jest.Mock;
  resolveActiveService: jest.Mock;
  loadSlotInputs: jest.Mock;
}

function makeRepo(subscriptionStatus: string | null): RepoStub {
  return {
    resolveTenant: jest.fn().mockResolvedValue(fakeTenant),
    resolvePublicTarget: jest.fn().mockResolvedValue({
      tenant: fakeTenant,
      barbershop: { id: 'shop-1', slug: fakeTenant.slug, name: 'Shop' },
      units: [],
    }),
    getSubscriptionStatus: jest.fn().mockResolvedValue(subscriptionStatus),
    resolveActiveService: jest.fn(),
    loadSlotInputs: jest.fn(),
  };
}

const prismaStub = {} as never;
const slotsStub = {} as never;
const emailStub = {} as never;
const configStub = { get: jest.fn().mockReturnValue(undefined) } as never;
const jobsStub = { send: jest.fn() } as never;
const couponsStub = {} as never;

const minimalBody = {
  serviceId: 'svc-1',
  barberId: 'barber-1',
  startAt: new Date(Date.now() + 86_400_000).toISOString(), // tomorrow
  customerName: 'João',
  customerPhone: '+5511999999999',
  customerEmail: null,
};

function makeService(repo: RepoStub): BookingService {
  return new BookingService(
    prismaStub,
    repo as never,
    slotsStub,
    emailStub,
    configStub,
    jobsStub,
    couponsStub,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookingService — subscription gating', () => {
  it('throws ForbiddenException when tenant.status is "pending" (email não confirmado)', async () => {
    const repo = makeRepo('active');
    repo.resolvePublicTarget = jest.fn().mockResolvedValue({
      tenant: { ...fakeTenant, status: 'pending' },
      barbershop: { id: 'shop-1', slug: fakeTenant.slug, name: 'Shop' },
      units: [],
    });
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-pending',
        body: minimalBody as never,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when subscription status is "suspended"', async () => {
    const repo = makeRepo('suspended');
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-suspended',
        body: minimalBody as never,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.getSubscriptionStatus).toHaveBeenCalledWith(TENANT_ID);
  });

  it('throws ForbiddenException when subscription status is "cancelled"', async () => {
    const repo = makeRepo('cancelled');
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-cancelled',
        body: minimalBody as never,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.getSubscriptionStatus).toHaveBeenCalledWith(TENANT_ID);
  });

  it('does NOT throw ForbiddenException when subscription status is "active" (proceeds past gate)', async () => {
    // With status='active' the gate passes; the call then hits resolveActiveService
    // (mocked to throw a NotFoundException-like to abort early). We assert that
    // the thrown error is NOT a ForbiddenException.
    const repo = makeRepo('active');
    repo.resolveActiveService = jest.fn().mockRejectedValue(new Error('service-not-found-stub'));
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-active',
        body: minimalBody as never,
      }),
    ).rejects.not.toThrow(ForbiddenException);
  });

  it('does NOT throw ForbiddenException when subscription status is "past_due"', async () => {
    // past_due está na janela de graça (dunning) — agendamento ainda liberado.
    const repo = makeRepo('past_due');
    repo.resolveActiveService = jest.fn().mockRejectedValue(new Error('service-not-found-stub'));
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-past-due',
        body: minimalBody as never,
      }),
    ).rejects.not.toThrow(ForbiddenException);
  });

  it('does NOT throw ForbiddenException when subscription status is "trialing"', async () => {
    const repo = makeRepo('trialing');
    repo.resolveActiveService = jest.fn().mockRejectedValue(new Error('service-not-found-stub'));
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-trialing',
        body: minimalBody as never,
      }),
    ).rejects.not.toThrow(ForbiddenException);
  });

  it('does NOT throw ForbiddenException when subscription row is absent (null — legacy tenant)', async () => {
    const repo = makeRepo(null);
    repo.resolveActiveService = jest.fn().mockRejectedValue(new Error('service-not-found-stub'));
    const service = makeService(repo);

    await expect(
      service.book({
        slug: TENANT_SLUG,
        idempotencyKey: 'idem-key-null',
        body: minimalBody as never,
      }),
    ).rejects.not.toThrow(ForbiddenException);
  });
});
