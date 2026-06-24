# Billing / Assinatura SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrar assinatura recorrente da plataforma sobre o dono da barbearia, com cartão no onboarding, trial de 14 dias e cobrança automática via Mercado Pago preapproval, com gating de suspensão por inadimplência.

**Architecture:** O Mercado Pago (preapproval) cuida de trial/recorrência/retries; o backend cria o preapproval no onboarding, grava uma `Subscription` por tenant e reage a webhooks (state machine). Um guard bloqueia escrita no admin e novos agendamentos quando suspenso. Tokenização do cartão é client-side via SDK do MP (PCI-safe).

**Tech Stack:** NestJS + Prisma + Postgres (RLS) no `apps/api`; Next.js no `apps/web`; Zod em `@barbearia/schemas`; Mercado Pago Assinaturas (preapproval) na conta plataforma; jest (DB local Docker) pros testes.

## Global Constraints

- Preços: **Mensal R$99,90 (`9990` cents)** / **Anual R$999,00 (`99900` cents)**; trial **14 dias**; graça **7 dias** (`BILLING_GRACE_DAYS = 7`).
- Número de cartão (PAN) **nunca** trafega/é gravado no backend — só `cardTokenId` tokenizado no cliente via SDK do MP.
- Assinatura é **por tenant** (1 `Subscription` por barbearia, `tenantId` unique).
- Cobrança da assinatura usa a **conta plataforma** (`MERCADOPAGO_ACCESS_TOKEN`), nunca o token do vendedor.
- Webhooks de assinatura resolvem o tenant pelo **`mpPreapprovalId` local** (nunca confiar só no `external_reference`).
- Tabelas novas são **tenant-scoped com RLS** (policy `tenant_id = current_setting('app.tenant_id', true)::uuid`), seguindo o padrão das migrations existentes.
- Status válidos da `Subscription`: `trialing` | `active` | `past_due` | `suspended` | `cancelled`.
- Rodar testes com o DB local: `pnpm --filter @barbearia/api test:db:up` antes; specs de DB seguem o padrão de `apps/api/test/cancel-fee.spec.ts`.

---

## File Structure

- `packages/schemas/src/billing.ts` — **Create**: constantes (`BILLING_PLAN`, `TRIAL_DAYS`, `BILLING_GRACE_DAYS`), tipos (`BillingCycle`, `SubscriptionStatus`), helpers de gating puros.
- `packages/schemas/src/onboarding.ts` — **Modify**: adiciona `billingCycle` + `cardTokenId` ao `createTenantOnboardingSchema`.
- `packages/schemas/src/index.ts` — **Modify**: `export * from './billing'`.
- `apps/api/prisma/schema.prisma` — **Modify**: model `Subscription` + relação em `Tenant`.
- `apps/api/prisma/migrations/<ts>_billing_subscription/migration.sql` — **Create**: tabela + RLS.
- `apps/api/src/payment/mercadopago.provider.ts` — **Modify**: métodos de preapproval.
- `apps/api/src/billing/billing.service.ts` — **Create**: state machine + escrita da `Subscription`.
- `apps/api/src/billing/billing.module.ts` — **Create**: módulo Nest.
- `apps/api/src/billing/subscription.guard.ts` — **Create**: gating.
- `apps/api/src/billing/admin-billing.controller.ts` — **Create**: `GET/POST /admin/subscription*`.
- `apps/api/src/onboarding/onboarding.controller.ts` — **Modify**: cria preapproval + `Subscription`.
- `apps/api/src/payment/mercadopago-webhook.controller.ts` — **Modify**: roteia tópicos de assinatura.
- `apps/web/src/app/onboarding/page.tsx` — **Modify**: seletor de ciclo + Card Brick.
- `apps/web/src/app/admin/assinatura/page.tsx` — **Create**: tela de assinatura.
- `apps/web/src/app/page.tsx` (landing) — **Modify**: copy "14 dias grátis".
- Tests: `apps/api/test/billing-state-machine.spec.ts`, `billing-onboarding.spec.ts`, `billing-webhook.spec.ts`, `subscription-guard.spec.ts`.

---

## Task 1: Constantes e tipos de billing (`@barbearia/schemas`)

**Files:**
- Create: `packages/schemas/src/billing.ts`
- Modify: `packages/schemas/src/index.ts`
- Test: `packages/schemas/src/billing.spec.ts`

**Interfaces:**
- Produces: `BILLING_PLAN`, `TRIAL_DAYS=14`, `BILLING_GRACE_DAYS=7`, type `BillingCycle = 'monthly'|'annual'`, type `SubscriptionStatus`, `planForCycle(cycle): { priceCents; mpFrequency; mpFrequencyType }`, `subscriptionAllowsWrite(status): boolean`, `subscriptionAllowsPublicBooking(status): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/schemas/src/billing.spec.ts
import {
  BILLING_PLAN, TRIAL_DAYS, BILLING_GRACE_DAYS,
  planForCycle, subscriptionAllowsWrite, subscriptionAllowsPublicBooking,
} from './billing';

describe('billing constants/helpers', () => {
  it('preços e janelas conforme spec', () => {
    expect(BILLING_PLAN.monthly.priceCents).toBe(9990);
    expect(BILLING_PLAN.annual.priceCents).toBe(99900);
    expect(TRIAL_DAYS).toBe(14);
    expect(BILLING_GRACE_DAYS).toBe(7);
  });
  it('planForCycle devolve frequência do MP', () => {
    expect(planForCycle('monthly')).toMatchObject({ priceCents: 9990, mpFrequency: 1, mpFrequencyType: 'months' });
    expect(planForCycle('annual')).toMatchObject({ priceCents: 99900, mpFrequency: 12, mpFrequencyType: 'months' });
  });
  it('gating: libera trialing/active/past_due, bloqueia suspended/cancelled', () => {
    for (const s of ['trialing', 'active', 'past_due'] as const) {
      expect(subscriptionAllowsWrite(s)).toBe(true);
      expect(subscriptionAllowsPublicBooking(s)).toBe(true);
    }
    for (const s of ['suspended', 'cancelled'] as const) {
      expect(subscriptionAllowsWrite(s)).toBe(false);
      expect(subscriptionAllowsPublicBooking(s)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/schemas test billing`
Expected: FAIL (módulo `./billing` não existe).

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/schemas/src/billing.ts
export const TRIAL_DAYS = 14;
export const BILLING_GRACE_DAYS = 7;

export const BILLING_PLAN = {
  monthly: { cycle: 'monthly', priceCents: 9990, mpFrequency: 1, mpFrequencyType: 'months' },
  annual: { cycle: 'annual', priceCents: 99900, mpFrequency: 12, mpFrequencyType: 'months' },
} as const;

export type BillingCycle = keyof typeof BILLING_PLAN; // 'monthly' | 'annual'
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export function planForCycle(cycle: BillingCycle) {
  return BILLING_PLAN[cycle];
}

const ALLOWED = new Set<SubscriptionStatus>(['trialing', 'active', 'past_due']);
export function subscriptionAllowsWrite(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
export function subscriptionAllowsPublicBooking(status: SubscriptionStatus): boolean {
  return ALLOWED.has(status);
}
```

- [ ] **Step 4: Add the export**

Em `packages/schemas/src/index.ts`, adicione (ordem alfabética, antes de `./book-appointment`):
```ts
export * from './billing';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @barbearia/schemas test billing`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas/src/billing.ts packages/schemas/src/billing.spec.ts packages/schemas/src/index.ts
git commit -m "feat(schemas): constantes e helpers de billing (planos, gating)"
```

---

## Task 2: Estender o schema de onboarding

**Files:**
- Modify: `packages/schemas/src/onboarding.ts:80-90`
- Test: `packages/schemas/src/onboarding.spec.ts` (criar se não existir)

**Interfaces:**
- Consumes: `BillingCycle` (Task 1).
- Produces: `createTenantOnboardingSchema` agora exige `billingCycle: 'monthly'|'annual'` e `cardTokenId: string` (min 1).

- [ ] **Step 1: Write the failing test**

```ts
// packages/schemas/src/onboarding.spec.ts
import { createTenantOnboardingSchema } from './onboarding';

const base = {
  ownerCpf: '529.982.247-25',
  tenant: { slug: 'barbearia-x', name: 'Barbearia X' },
  organization: { name: 'Org X' },
  location: { name: 'Matriz', addressLine1: 'Rua 1', city: 'Rio', state: 'RJ', postalCode: '20000-000' },
  barbershop: { name: 'Barbearia X', lateCancelFeePct: 15 },
};

describe('createTenantOnboardingSchema billing', () => {
  it('rejeita sem billingCycle/cardTokenId', () => {
    expect(createTenantOnboardingSchema.safeParse(base).success).toBe(false);
  });
  it('aceita com billingCycle e cardTokenId', () => {
    const r = createTenantOnboardingSchema.safeParse({ ...base, billingCycle: 'annual', cardTokenId: 'tok_123' });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/schemas test onboarding`
Expected: FAIL (o schema aceita sem os campos novos).

- [ ] **Step 3: Implement**

Em `packages/schemas/src/onboarding.ts`, adicione no topo o import:
```ts
import { BILLING_PLAN } from './billing';
```
E altere o objeto `createTenantOnboardingSchema` para incluir:
```ts
  billingCycle: z.enum(Object.keys(BILLING_PLAN) as [string, ...string[]]),
  cardTokenId: z.string().min(1),
```
(adicione as duas linhas dentro do `z.object({ ... })`, após `barbershop: barbershopBlock,`)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/schemas test onboarding`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/onboarding.ts packages/schemas/src/onboarding.spec.ts
git commit -m "feat(schemas): onboarding exige billingCycle + cardTokenId"
```

---

## Task 3: Model `Subscription` + migration RLS

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `Subscription` + `subscription Subscription?` em `Tenant`)
- Create: `apps/api/prisma/migrations/20260624120000_billing_subscription/migration.sql`

**Interfaces:**
- Produces: tabela `subscriptions` + delegate Prisma `prisma.subscription` com campos: `id, tenantId(unique), billingCycle, status, priceCents, mpPreapprovalId?, trialEndsAt, currentPeriodEnd?, lastPaymentStatus?, lastChargedAt?, createdAt, updatedAt`.

- [ ] **Step 1: Adicionar o model ao schema.prisma**

Após o model `Tenant` (antes de `@@map("tenants")` adicione a relação; depois adicione o model):
```prisma
// dentro de model Tenant, junto das outras relações:
  subscription  Subscription?
```
```prisma
/// Assinatura SaaS da barbearia (ADR-billing). 1:1 com Tenant.
model Subscription {
  id                String    @id @default(uuid()) @db.Uuid
  tenantId          String    @unique @map("tenant_id") @db.Uuid
  /// 'monthly' | 'annual'
  billingCycle      String    @map("billing_cycle")
  /// 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'
  status            String    @default("trialing")
  priceCents        Int       @map("price_cents")
  /// id do preapproval no Mercado Pago (resolve webhook). SEGREDO operacional.
  mpPreapprovalId   String?   @map("mp_preapproval_id")
  trialEndsAt       DateTime  @map("trial_ends_at") @db.Timestamptz(6)
  currentPeriodEnd  DateTime? @map("current_period_end") @db.Timestamptz(6)
  lastPaymentStatus String?   @map("last_payment_status")
  lastChargedAt     DateTime? @map("last_charged_at") @db.Timestamptz(6)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([mpPreapprovalId])
  @@map("subscriptions")
}
```

- [ ] **Step 2: Escrever a migration SQL**

```sql
-- apps/api/prisma/migrations/20260624120000_billing_subscription/migration.sql
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "billing_cycle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "price_cents" INTEGER NOT NULL,
    "mp_preapproval_id" TEXT,
    "trial_ends_at" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6),
    "last_payment_status" TEXT,
    "last_charged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
CREATE INDEX "subscriptions_mp_preapproval_id_idx" ON "subscriptions"("mp_preapproval_id");

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (mesmo padrão das demais tabelas tenant-scoped)
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_tenant_isolation" ON "subscriptions"
    USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

> Confira no `migration.sql` de `20260603120000_s19_coupons` se há `GRANT`/`FORCE ROW LEVEL SECURITY` adicionais aplicados às tabelas tenant-scoped e replique-os aqui para `subscriptions`.

- [ ] **Step 3: Gerar o client e aplicar no DB de teste**

Run:
```bash
pnpm --filter @barbearia/api prisma:generate
pnpm --filter @barbearia/api test:db:up
pnpm --filter @barbearia/api test:db:migrate
```
Expected: migration aplicada sem erro; `prisma.subscription` disponível no client.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260624120000_billing_subscription/
git commit -m "feat(db): tabela subscriptions com RLS tenant-scoped"
```

---

## Task 4: Métodos de preapproval no `MercadoPagoProvider`

**Files:**
- Modify: `apps/api/src/payment/mercadopago.provider.ts`
- Test: `apps/api/test/mercadopago-preapproval.spec.ts`

**Interfaces:**
- Consumes: `this.baseUrl`, `this.config` (`MERCADOPAGO_ACCESS_TOKEN`), helper de fetch existente.
- Produces:
  - `createPreapproval(input: { reason: string; externalReference: string; payerEmail: string; cardTokenId: string; amountCents: number; frequency: number; frequencyType: string; trialDays: number; backUrl: string }): Promise<{ id: string; status: string }>`
  - `getPreapproval(id: string): Promise<{ id: string; status: string; external_reference?: string }>`
  - `updatePreapprovalCard(id: string, cardTokenId: string): Promise<void>`
  - `cancelPreapproval(id: string): Promise<void>`

- [ ] **Step 1: Write the failing test (mock do fetch global)**

```ts
// apps/api/test/mercadopago-preapproval.spec.ts
import { ConfigService } from '@nestjs/config';
import { MercadoPagoProvider } from '../src/payment/mercadopago.provider';

function providerWithToken(): MercadoPagoProvider {
  const config = {
    get: (k: string) =>
      ({ MERCADOPAGO_BASE_URL: 'https://api.mp', MERCADOPAGO_ACCESS_TOKEN: 'APP_USR_x' } as Record<string, string>)[k],
  } as unknown as ConfigService;
  return new MercadoPagoProvider(config);
}

describe('MercadoPagoProvider.createPreapproval', () => {
  afterEach(() => jest.restoreAllMocks());

  it('POSTa /preapproval com free_trial e devolve id/status', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'pre_1', status: 'authorized' }), { status: 201 }),
    );
    const p = providerWithToken();
    const r = await p.createPreapproval({
      reason: 'Assinatura', externalReference: 'tenant-1', payerEmail: 'd@x.com',
      cardTokenId: 'tok_1', amountCents: 9990, frequency: 1, frequencyType: 'months',
      trialDays: 14, backUrl: 'https://app/x',
    });
    expect(r).toEqual({ id: 'pre_1', status: 'authorized' });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.auto_recurring.transaction_amount).toBe(99.9);
    expect(body.auto_recurring.free_trial).toEqual({ frequency: 14, frequency_type: 'days' });
    expect(body.external_reference).toBe('tenant-1');
  });

  it('lança quando o MP recusa', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid card_token' }), { status: 400 }),
    );
    await expect(
      providerWithToken().createPreapproval({
        reason: 'x', externalReference: 't', payerEmail: 'd@x.com', cardTokenId: 'bad',
        amountCents: 9990, frequency: 1, frequencyType: 'months', trialDays: 14, backUrl: 'b',
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test mercadopago-preapproval`
Expected: FAIL (métodos não existem).

- [ ] **Step 3: Implement os métodos**

Adicione ao `MercadoPagoProvider` (use a conta plataforma — `MERCADOPAGO_ACCESS_TOKEN` — nunca token de vendedor):
```ts
private platformToken(): string {
  return this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? '';
}

async createPreapproval(input: {
  reason: string; externalReference: string; payerEmail: string; cardTokenId: string;
  amountCents: number; frequency: number; frequencyType: string; trialDays: number; backUrl: string;
}): Promise<{ id: string; status: string }> {
  const body = {
    reason: input.reason,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    card_token_id: input.cardTokenId,
    back_url: input.backUrl,
    status: 'authorized',
    auto_recurring: {
      frequency: input.frequency,
      frequency_type: input.frequencyType,
      transaction_amount: input.amountCents / 100,
      currency_id: 'BRL',
      free_trial: { frequency: input.trialDays, frequency_type: 'days' },
    },
  };
  const res = await fetch(`${this.baseUrl}/preapproval`, {
    method: 'POST',
    headers: { authorization: `Bearer ${this.platformToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!res.ok || !json.id) {
    MercadoPagoProvider.logger.error(`MP preapproval create → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    throw new Error('Falha ao criar a assinatura (cartão recusado ou dados inválidos).');
  }
  return { id: json.id, status: json.status ?? 'authorized' };
}

async getPreapproval(id: string): Promise<{ id: string; status: string; external_reference?: string }> {
  const res = await fetch(`${this.baseUrl}/preapproval/${id}`, {
    headers: { authorization: `Bearer ${this.platformToken()}` },
  });
  if (!res.ok) throw new Error(`MP getPreapproval ${id} → ${res.status}`);
  return (await res.json()) as { id: string; status: string; external_reference?: string };
}

async updatePreapprovalCard(id: string, cardTokenId: string): Promise<void> {
  const res = await fetch(`${this.baseUrl}/preapproval/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${this.platformToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ card_token_id: cardTokenId }),
  });
  if (!res.ok) throw new Error(`MP updatePreapprovalCard ${id} → ${res.status}`);
}

async cancelPreapproval(id: string): Promise<void> {
  const res = await fetch(`${this.baseUrl}/preapproval/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${this.platformToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) throw new Error(`MP cancelPreapproval ${id} → ${res.status}`);
}
```
> Verifique o nome exato do campo `baseUrl`/getter no provider (ex.: `this.baseUrl`) e ajuste se necessário; reuse o mesmo padrão do método `post` existente.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test mercadopago-preapproval`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payment/mercadopago.provider.ts apps/api/test/mercadopago-preapproval.spec.ts
git commit -m "feat(payment): métodos de preapproval (assinatura) no MercadoPagoProvider"
```

---

## Task 5: `BillingService` — state machine + escrita

**Files:**
- Create: `apps/api/src/billing/billing.service.ts`
- Create: `apps/api/src/billing/billing.module.ts`
- Test: `apps/api/test/billing-state-machine.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `MercadoPagoProvider`, helpers de `@barbearia/schemas`.
- Produces:
  - `mapPreapprovalStatus(mpStatus: string): SubscriptionStatus | null` (pura: `cancelled`→`cancelled`, `paused`→`suspended`, outros→null).
  - `applyRecurringPayment(preapprovalId: string, approved: boolean, cycle: BillingCycle, when: Date): Promise<void>` — aprovado → `active` + `currentPeriodEnd` (+1 ou +12 meses) + `lastChargedAt`; recusado → `past_due`.
  - `applyPreapprovalStatus(preapprovalId: string, mpStatus: string): Promise<void>`.
  - `getByTenant(tenantId: string)` / `getByPreapprovalId(id: string)`.

- [ ] **Step 1: Write the failing test (pura, sem DB)**

```ts
// apps/api/test/billing-state-machine.spec.ts
import { addMonths } from 'date-fns';
import { computeNextPeriodEnd, mapPreapprovalStatus } from '../src/billing/billing.service';

describe('billing state machine (puro)', () => {
  it('mapeia status do preapproval', () => {
    expect(mapPreapprovalStatus('cancelled')).toBe('cancelled');
    expect(mapPreapprovalStatus('paused')).toBe('suspended');
    expect(mapPreapprovalStatus('authorized')).toBeNull();
  });
  it('próximo período: mensal +1, anual +12', () => {
    const base = new Date('2026-06-24T00:00:00Z');
    expect(computeNextPeriodEnd('monthly', base).getTime()).toBe(addMonths(base, 1).getTime());
    expect(computeNextPeriodEnd('annual', base).getTime()).toBe(addMonths(base, 12).getTime());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test billing-state-machine`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implement (exporta as funções puras + a classe)**

```ts
// apps/api/src/billing/billing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import type { BillingCycle, SubscriptionStatus } from '@barbearia/schemas';
import { addMonths } from 'date-fns';

import { MercadoPagoProvider } from '../payment/mercadopago.provider';
import { PrismaService } from '../prisma/prisma.service';

export function mapPreapprovalStatus(mpStatus: string): SubscriptionStatus | null {
  if (mpStatus === 'cancelled') return 'cancelled';
  if (mpStatus === 'paused') return 'suspended';
  return null;
}

export function computeNextPeriodEnd(cycle: BillingCycle, from: Date): Date {
  return addMonths(from, cycle === 'annual' ? 12 : 1);
}

@Injectable()
export class BillingService {
  private static readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoProvider,
  ) {}

  getByPreapprovalId(mpPreapprovalId: string) {
    return this.prisma.subscription.findFirst({ where: { mpPreapprovalId } });
  }

  getByTenant(tenantId: string) {
    return this.prisma.subscription.findUnique({ where: { tenantId } });
  }

  async applyRecurringPayment(mpPreapprovalId: string, approved: boolean, when: Date): Promise<void> {
    const sub = await this.getByPreapprovalId(mpPreapprovalId);
    if (!sub) {
      BillingService.logger.warn(`Cobrança recorrente sem Subscription local: preapproval=${mpPreapprovalId}`);
      return;
    }
    if (approved) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          lastPaymentStatus: 'approved',
          lastChargedAt: when,
          currentPeriodEnd: computeNextPeriodEnd(sub.billingCycle as BillingCycle, when),
        },
      });
    } else {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'past_due', lastPaymentStatus: 'rejected' },
      });
    }
  }

  async applyPreapprovalStatus(mpPreapprovalId: string, mpStatus: string): Promise<void> {
    const mapped = mapPreapprovalStatus(mpStatus);
    if (!mapped) return;
    const sub = await this.getByPreapprovalId(mpPreapprovalId);
    if (!sub) return;
    await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: mapped } });
  }
}
```
```ts
// apps/api/src/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
```
> Ajuste os imports de `PrismaModule`/`PaymentModule` aos nomes reais no projeto. Se `MercadoPagoProvider` não é exportado por `PaymentModule`, exporte-o lá.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test billing-state-machine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/billing/ apps/api/test/billing-state-machine.spec.ts
git commit -m "feat(billing): BillingService com state machine de assinatura"
```

---

## Task 6: Onboarding cria preapproval + `Subscription`

**Files:**
- Modify: `apps/api/src/onboarding/onboarding.controller.ts`
- Modify: `apps/api/src/onboarding/onboarding.module.ts` (importar `PaymentModule`/`BillingModule`)
- Test: `apps/api/test/billing-onboarding.spec.ts`

**Interfaces:**
- Consumes: `MercadoPagoProvider.createPreapproval`/`cancelPreapproval` (Task 4), `planForCycle` (Task 1), `prisma.subscription`.
- Produces: ao criar tenant, cria preapproval e grava `Subscription` (`status='trialing'`, `mpPreapprovalId`, `trialEndsAt=now+14d`). Falha do MP → onboarding falha sem criar barbearia.

- [ ] **Step 1: Write the failing test (DB local + provider mockado)**

```ts
// apps/api/test/billing-onboarding.spec.ts
// Padrão de cancel-fee.spec.ts: app Nest com DB local; mocka MercadoPagoProvider.
// Asserts:
//  - onboarding cria 1 row em subscriptions com status 'trialing' e mp_preapproval_id setado.
//  - quando createPreapproval lança, NENHUM tenant/subscription é criado (rollback) e responde erro.
```
(Implemente o spec seguindo a montagem de `apps/api/test/cancel-fee.spec.ts`: `Test.createTestingModule` com `OnboardingModule`, override do `MercadoPagoProvider` por um mock cujo `createPreapproval` resolve `{ id: 'pre_x', status: 'authorized' }` no caso feliz e `mockRejectedValue` no caso de erro. Use o helper de set de `app.user_id`/sessão já usado nos specs de `/me`/onboarding.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test billing-onboarding`
Expected: FAIL (controller ainda não cria subscription).

- [ ] **Step 3: Implement no `onboarding.controller.ts`**

Injete os serviços e crie o preapproval **antes** da transação de banco (chamada externa fora da tx). Após criar `barbershop`, dentro do mesmo `try`, grave a `Subscription`. Em caso de erro pós-preapproval, cancele-o.

```ts
// no constructor:
constructor(
  private readonly mp: MercadoPagoProvider,
) {}

// dentro de createTenant, ANTES do try do DB, após gerar tenantId:
const plan = planForCycle(body.billingCycle as BillingCycle);
const ownerEmail = ctx.userEmail; // confirmar como o email do user logado é exposto no ctx
const webUrl = process.env.PUBLIC_WEB_URL ?? 'https://appbarbeariab.com';
const preapproval = await this.mp.createPreapproval({
  reason: `Assinatura Navalha — ${body.tenant.name}`,
  externalReference: tenantId,
  payerEmail: ownerEmail,
  cardTokenId: body.cardTokenId,
  amountCents: plan.priceCents,
  frequency: plan.mpFrequency,
  frequencyType: plan.mpFrequencyType,
  trialDays: TRIAL_DAYS,
  backUrl: `${webUrl}/admin/assinatura`,
});
```
No fim do bloco que cria a barbershop (passo 6), adicione:
```ts
await ctx.tx.subscription.create({
  data: {
    tenantId,
    billingCycle: body.billingCycle,
    status: 'trialing',
    priceCents: plan.priceCents,
    mpPreapprovalId: preapproval.id,
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
  },
});
```
E no `catch`, antes de re-lançar, compense:
```ts
// best-effort: não deixa preapproval órfão se o DB falhar
try { await this.mp.cancelPreapproval(preapproval.id); } catch { /* log only */ }
```
Imports a adicionar: `planForCycle, TRIAL_DAYS, type BillingCycle` de `@barbearia/schemas`; `MercadoPagoProvider`.
> Confirme como obter o **email do dono** no `ctx` (`ctx.userEmail`?). Se não existir, busque via `ctx.tx.appUser.findUnique({ where: { id: ctx.userId }, select: { email: true } })` antes do preapproval.

- [ ] **Step 4: Importar os módulos**

Em `onboarding.module.ts`, adicione `PaymentModule` (e `BillingModule` se precisar do service) aos `imports`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test billing-onboarding`
Expected: PASS (cria subscription; erro do MP não cria tenant).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/onboarding/ apps/api/test/billing-onboarding.spec.ts
git commit -m "feat(onboarding): cria preapproval MP + Subscription no cadastro"
```

---

## Task 7: Webhook roteia tópicos de assinatura

**Files:**
- Modify: `apps/api/src/payment/mercadopago-webhook.controller.ts`
- Test: `apps/api/test/billing-webhook.spec.ts`

**Interfaces:**
- Consumes: `BillingService` (Task 5), `MercadoPagoProvider.getPreapproval`.
- Produces: eventos `subscription_authorized_payment` → `applyRecurringPayment`; `subscription_preapproval` → `applyPreapprovalStatus`. Mantém a verificação de assinatura + dedup. Não confunde com pagamentos do marketplace.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/billing-webhook.spec.ts
// Monta o controller com BillingService real (DB local) + MercadoPagoProvider mockado.
// Cria uma Subscription trialing com mpPreapprovalId='pre_1'.
// 1) evento subscription_authorized_payment aprovado → status vira 'active', currentPeriodEnd setado.
// 2) evento subscription_preapproval com status 'cancelled' → status vira 'cancelled'.
// 3) assinatura inválida (x-signature) → no-op, status inalterado.
```
(Implemente seguindo `apps/api/test/payment-security.spec.ts` pra montar o controller e forjar headers/body.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test billing-webhook`
Expected: FAIL.

- [ ] **Step 3: Implement o roteamento**

No `handle()`, antes do filtro `if (!dataId || !eventType?.includes('payment'))`, adicione o branch de assinatura (após a verificação de assinatura, que deve cobrir também esses eventos):
```ts
// Eventos de assinatura (billing) — separados do pagamento do marketplace.
if (eventType === 'subscription_authorized_payment') {
  // dataId = id do pagamento recorrente; busca o pagamento p/ status + preapproval.
  const pay = await this.provider.getPayment(dataId); // usa token plataforma (sem sellerToken)
  const preapprovalId = String((pay as Record<string, unknown>).preapproval_id ?? '');
  const approved = pay.status === 'approved';
  if (preapprovalId) {
    // dedup estável por pagamento+status (mesmo padrão M1)
    const first = await this.webhookIdempotency.isFirstProcessing('mp_sub_payment', `${dataId}:${pay.status}`);
    if (first) await this.billing.applyRecurringPayment(preapprovalId, approved, new Date());
  }
  return { ok: true };
}
if (eventType === 'subscription_preapproval') {
  const pre = await this.provider.getPreapproval(dataId);
  const first = await this.webhookIdempotency.isFirstProcessing('mp_sub_preapproval', `${dataId}:${pre.status}`);
  if (first) await this.billing.applyPreapprovalStatus(dataId, pre.status);
  return { ok: true };
}
```
Injete `BillingService` no constructor e ajuste o `BillingModule`/`PaymentModule` pra disponibilizá-lo. Garanta que a **verificação de assinatura roda também** para esses tópicos (mover o early-return de "só payment" para depois desses branches, ou incluir os tópicos de assinatura na verificação).
> Confirme o nome do campo do preapproval no payload do pagamento recorrente do MP (`preapproval_id`); ajuste se o sandbox retornar outro nome.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test billing-webhook`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payment/mercadopago-webhook.controller.ts apps/api/test/billing-webhook.spec.ts
git commit -m "feat(billing): webhook trata cobrança recorrente e status do preapproval"
```

---

## Task 8: `SubscriptionGuard` + gating

**Files:**
- Create: `apps/api/src/billing/subscription.guard.ts`
- Modify: `apps/api/src/slots/booking.controller.ts` (aplica guard no POST de criar agendamento)
- Modify: controllers de escrita do admin (services/employees/hours) p/ aplicar o guard
- Test: `apps/api/test/subscription-guard.spec.ts`

**Interfaces:**
- Consumes: `BillingService.getByTenant`, `subscriptionAllowsWrite`/`subscriptionAllowsPublicBooking` (Task 1), `TenantContextValue` (tenant ativo).
- Produces: `SubscriptionGuard` (NestJS `CanActivate`) que lê o tenant do contexto e nega (`403`) quando `suspended`/`cancelled`.

- [ ] **Step 1: Write the failing test (pura sobre a decisão)**

```ts
// apps/api/test/subscription-guard.spec.ts
import { subscriptionAllowsPublicBooking, subscriptionAllowsWrite } from '@barbearia/schemas';

describe('gating decisions', () => {
  it('suspended/cancelled bloqueiam escrita e booking', () => {
    expect(subscriptionAllowsWrite('suspended')).toBe(false);
    expect(subscriptionAllowsPublicBooking('cancelled')).toBe(false);
  });
  it('trialing/active/past_due liberam', () => {
    expect(subscriptionAllowsWrite('past_due')).toBe(true);
    expect(subscriptionAllowsPublicBooking('trialing')).toBe(true);
  });
});
```
(Para o guard em si, um teste de integração no estilo `payment-security.spec.ts`: tenant com subscription `suspended` → `POST /public/tenants/:slug/appointments` responde 403.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test subscription-guard`
Expected: FAIL até o guard existir/ser aplicado (a parte pura passa; a de integração falha).

- [ ] **Step 3: Implement o guard**

```ts
// apps/api/src/billing/subscription.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { SubscriptionStatus } from '@barbearia/schemas';
import { subscriptionAllowsPublicBooking } from '@barbearia/schemas';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const tenantId: string | undefined = req.tenantContext?.tenantId ?? req.params?.tenantId;
    if (!tenantId) return true; // rota sem tenant resolvido — não é nosso alvo
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId }, select: { status: true } });
    if (!sub) return true; // sem assinatura (legado) — não bloqueia
    if (!subscriptionAllowsPublicBooking(sub.status as SubscriptionStatus)) {
      throw new ForbiddenException('Esta barbearia está com a assinatura suspensa.');
    }
    return true;
  }
}
```
> Ajuste a forma de obter `tenantId` ao mecanismo real do `TenantInterceptor` (como o slug público resolve o tenant). Para o booking público, o slug → tenant: resolva o tenant pelo slug antes da checagem (ou aplique o guard após o interceptor que já setou o tenant).

Aplique `@UseGuards(SubscriptionGuard)` no handler de criar agendamento (`booking.controller.ts`) e nos POST/PATCH/DELETE de admin (services/employees/hours). Para escrita de admin, troque o helper de decisão por `subscriptionAllowsWrite`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test subscription-guard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/billing/subscription.guard.ts apps/api/src/slots/booking.controller.ts apps/api/test/subscription-guard.spec.ts
git commit -m "feat(billing): SubscriptionGuard bloqueia uso quando suspenso"
```

---

## Task 9: Endpoints de admin da assinatura

**Files:**
- Create: `apps/api/src/billing/admin-billing.controller.ts`
- Modify: `apps/api/src/billing/billing.module.ts` (registrar o controller)
- Test: `apps/api/test/admin-billing.spec.ts`

**Interfaces:**
- Consumes: `assertTenantAdmin` (mesmo padrão de `admin-mp.controller.ts`), `BillingService`, `MercadoPagoProvider`.
- Produces:
  - `GET /admin/subscription` → `{ status, billingCycle, priceCents, trialEndsAt, currentPeriodEnd }` (sem dado de cartão).
  - `POST /admin/subscription/update-card` body `{ cardTokenId }` → atualiza cartão no preapproval; se estava `past_due`, MP retoma.
  - `POST /admin/subscription/cancel` → cancela preapproval → status `cancelled`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/admin-billing.spec.ts
// Estilo admin-services.controller.spec.ts:
//  - GET /admin/subscription com X-Tenant-Id do admin devolve o status atual.
//  - GET sem X-Tenant-Id → 403.
//  - POST /admin/subscription/cancel chama mp.cancelPreapproval e status vira 'cancelled'.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @barbearia/api test admin-billing`
Expected: FAIL.

- [ ] **Step 3: Implement o controller**

```ts
// apps/api/src/billing/admin-billing.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { MercadoPagoProvider } from '../payment/mercadopago.provider';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/subscription')
export class AdminBillingController {
  constructor(private readonly mp: MercadoPagoProvider) {}

  @Get()
  async get(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'ver a assinatura');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    return sub
      ? {
          status: sub.status, billingCycle: sub.billingCycle, priceCents: sub.priceCents,
          trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd,
        }
      : null;
  }

  @Post('update-card')
  @HttpCode(HttpStatus.OK)
  async updateCard(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { cardTokenId?: string },
  ) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'atualizar o cartão');
    if (!body.cardTokenId) throw new Error('cardTokenId obrigatório.');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (!sub?.mpPreapprovalId) throw new Error('Assinatura sem preapproval.');
    await this.mp.updatePreapprovalCard(sub.mpPreapprovalId, body.cardTokenId);
    return { ok: true };
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'cancelar a assinatura');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (sub?.mpPreapprovalId) await this.mp.cancelPreapproval(sub.mpPreapprovalId);
    await ctx.tx.subscription.update({ where: { tenantId }, data: { status: 'cancelled' } });
    return { ok: true };
  }
}
```
Registre `AdminBillingController` em `BillingModule` (`controllers: [AdminBillingController]`) e garanta que o módulo está nos `imports` do `AppModule`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @barbearia/api test admin-billing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/billing/admin-billing.controller.ts apps/api/src/billing/billing.module.ts apps/api/test/admin-billing.spec.ts
git commit -m "feat(billing): endpoints admin (status, atualizar cartão, cancelar)"
```

---

## Task 10: Onboarding (web) — seletor de ciclo + Card Brick

**Files:**
- Modify: `apps/web/src/app/onboarding/page.tsx`
- Create: `apps/web/src/lib/mercadopago.ts` (loader do SDK + tokenização)
- Modify: `apps/web/.env` docs / Vercel envs (`NEXT_PUBLIC_MP_PUBLIC_KEY`)

**Interfaces:**
- Consumes: `BILLING_PLAN` (Task 1). Produz `cardTokenId` via SDK do MP e o envia no submit do onboarding junto de `billingCycle`.

- [ ] **Step 1: Loader do SDK do MP**

```ts
// apps/web/src/lib/mercadopago.ts
let sdkPromise: Promise<void> | null = null;

export function loadMercadoPagoSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).MercadoPago) return resolve();
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}
```

- [ ] **Step 2: Render do seletor de ciclo + campos de cartão (Secure Fields)**

No `onboarding/page.tsx`, adicione uma seção "Plano e pagamento":
- Toggle `billingCycle` (`monthly`/`annual`) mostrando `BILLING_PLAN[cycle].priceCents` formatado.
- Monte o **CardForm / Secure Fields** do MP com `NEXT_PUBLIC_MP_PUBLIC_KEY` em containers (`cardNumber`, `expirationDate`, `securityCode`) — campos hospedados pelo MP (iframe). No submit, chame `mp.createCardToken({...})` → `cardTokenId`.
- Adicione `billingCycle` e `cardTokenId` ao corpo enviado pro `POST /onboarding/tenant`.

> Use a doc do MP "CardForm"/"Secure Fields" (`mp.fields.create(...)`) pra montar os campos. O número do cartão fica no iframe do MP; só o token volta pro app.

- [ ] **Step 3: Verificação manual + typecheck/lint**

Run:
```bash
pnpm --filter @barbearia/web exec tsc --noEmit
pnpm --filter @barbearia/web exec eslint src/app/onboarding/page.tsx src/lib/mercadopago.ts
```
Expected: sem erros. Verificação manual no preview: campos de cartão renderizam (iframe), token é gerado, onboarding cria a barbearia + subscription `trialing`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/onboarding/page.tsx apps/web/src/lib/mercadopago.ts
git commit -m "feat(web): onboarding com seletor de ciclo + cartão tokenizado (MP)"
```

---

## Task 11: Tela `/admin/assinatura` + banner

**Files:**
- Create: `apps/web/src/app/admin/assinatura/page.tsx`
- Modify: `apps/web/src/app/admin/layout.tsx` ou `AdminShell` (banner `past_due`/`suspended`)

**Interfaces:**
- Consumes: `api.get('/admin/subscription', { tenantId })`, `api.post('/admin/subscription/update-card'|'/cancel', ...)`, `loadMercadoPagoSdk` (Task 10), `useActiveTenant`.

- [ ] **Step 1: Página de assinatura**

`/admin/assinatura`: mostra plano/ciclo, status, próximo débito + valor; botão **Atualizar cartão** (reusa o Card Brick → `cardTokenId` → `POST update-card`) e **Cancelar** (`POST cancel`). Passa `{ tenantId: tenant.id }` em todas as chamadas (padrão do `X-Tenant-Id`).

- [ ] **Step 2: Banner global**

No `AdminShell`, busque `GET /admin/subscription` e, se `status === 'past_due'`, mostre banner amarelo ("Pagamento pendente — atualize o cartão"); se `suspended`/`cancelled`, banner vermelho com link pra `/admin/assinatura`.

- [ ] **Step 3: Verificação manual + typecheck/lint**

Run:
```bash
pnpm --filter @barbearia/web exec tsc --noEmit
pnpm --filter @barbearia/web exec eslint src/app/admin/assinatura/page.tsx
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/assinatura/ apps/web/src/app/admin/layout.tsx
git commit -m "feat(web): tela de assinatura + banner de inadimplência"
```

---

## Task 12: Landing copy "14 dias grátis"

**Files:**
- Modify: `apps/web/src/app/page.tsx` (landing)

- [ ] **Step 1: Trocar a copy**

Troque "Sem cartão pra começar · cancele quando quiser" por **"14 dias grátis · cancele quando quiser"**. Ajuste qualquer outro texto que prometa "sem cartão" (ex.: subtítulo do onboarding).

- [ ] **Step 2: Verificação**

Run: `pnpm --filter @barbearia/web exec tsc --noEmit`
Expected: sem erros. Conferir visualmente que não restou "sem cartão".

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "copy(landing): trial agora exige cartão (14 dias grátis)"
```

---

## Self-Review (cobertura do spec)

- §3 catálogo → Task 1 ✅ · §4 modelo → Task 3 ✅ · §5 onboarding/tokenização → Tasks 2/6/10 ✅ · §6 webhooks/state machine → Tasks 5/7 ✅ · §7 gating → Task 8 ✅ · §8 UI/endpoints/landing → Tasks 9/11/12 ✅ + env `NEXT_PUBLIC_MP_PUBLIC_KEY` (Task 10) ✅ · §9 testes → specs em cada task ✅.
- Rede de segurança pg-boss (§6, opcional) **não** tem task dedicada — é opcional/pós-MVP; criar como follow-up se desejado (job diário usando `BILLING_GRACE_DAYS`).
- Confirmações marcadas com `>` (email do dono no ctx, nome do campo `preapproval_id`, `baseUrl` do provider, GRANTs de RLS, suporte a `free_trial`) devem ser resolvidas no início de cada task respectiva.
