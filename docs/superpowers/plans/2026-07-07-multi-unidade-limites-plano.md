# Multi-unidade + Limites por Plano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assinatura por dono (Tenant) com N unidades (Barbershops) dentro do tenant; o tier define teto de unidades e de funcionários por unidade.

**Architecture:** Monorepo pnpm/Turbo. Constantes de limite em `@barbearia/schemas`; enforcement num `PlanLimitsService` (NestJS, módulo billing) chamado nos pontos de criação/reativação; unidades ganham `slug`/`is_active` e um módulo admin próprio; público resolve slug de unidade com fallback pro slug do tenant.

**Tech Stack:** NestJS 11 + Prisma (Postgres/RLS), Zod, Next.js (web-admin), Mercado Pago preapproval.

**Spec:** `docs/superpowers/specs/2026-07-07-multi-unidade-limites-plano-design.md`

## Global Constraints

- Limites: `free: 1 unidade / 2 func por unidade`, `basic: 2 / 5`, `pro: 5 / 15`.
- Estouro de limite → HTTP **409** com body `{ code: 'PLAN_LIMIT_REACHED', resource: 'unit'|'employee', limit, current, tier }`.
- Sem Subscription → tratar como `free`.
- Reativação (funcionário ou unidade) passa pela mesma trava da criação.
- Testes da API precisam do DB de teste: `pnpm --filter @barbearia/api test:setup` (docker) uma vez antes.
- Commits frequentes, mensagens em pt-BR estilo conventional (`feat(billing): …`), **sem push**.
- Todo código novo segue os padrões dos arquivos vizinhos (controllers com `@Tx()`, `assertTenantAdmin`, Zod pipes; web com `api.get/post(..., { tenantId })`).
- Depois de mudar `packages/schemas`: `pnpm --filter @barbearia/schemas build` (o api consome `dist/`).

---

## Fase 1 — Limites

### Task 1: Catálogo de limites em `@barbearia/schemas`

**Files:**
- Modify: `packages/schemas/src/billing.ts`
- Test: `packages/schemas/src/billing.spec.ts`

**Interfaces:**
- Produces: `PLAN_LIMITS`, `limitsForTier(tier: PlanTier): { maxUnits: number; maxEmployeesPerUnit: number }`, `usageFitsTier(tier: PlanTier, usage: { units: number; maxEmployeesInAnyUnit: number }): boolean` — exportados pelo index do pacote (já reexporta `./billing`).

- [ ] **Step 1: Failing tests** — append em `billing.spec.ts`:

```ts
import { limitsForTier, PLAN_LIMITS, usageFitsTier } from './billing';

describe('PLAN_LIMITS', () => {
  it('define os tetos por tier', () => {
    expect(PLAN_LIMITS.free).toEqual({ maxUnits: 1, maxEmployeesPerUnit: 2 });
    expect(PLAN_LIMITS.basic).toEqual({ maxUnits: 2, maxEmployeesPerUnit: 5 });
    expect(PLAN_LIMITS.pro).toEqual({ maxUnits: 5, maxEmployeesPerUnit: 15 });
    expect(limitsForTier('basic')).toEqual({ maxUnits: 2, maxEmployeesPerUnit: 5 });
  });
});

describe('usageFitsTier', () => {
  it('cabe quando uso <= teto', () => {
    expect(usageFitsTier('basic', { units: 2, maxEmployeesInAnyUnit: 5 })).toBe(true);
    expect(usageFitsTier('free', { units: 1, maxEmployeesInAnyUnit: 2 })).toBe(true);
  });
  it('não cabe quando unidades ou funcionários excedem', () => {
    expect(usageFitsTier('free', { units: 2, maxEmployeesInAnyUnit: 1 })).toBe(false);
    expect(usageFitsTier('basic', { units: 1, maxEmployeesInAnyUnit: 6 })).toBe(false);
  });
});
```

- [ ] **Step 2:** `pnpm --filter @barbearia/schemas test` → FAIL (símbolos não existem).
- [ ] **Step 3: Implementar** — append em `billing.ts`:

```ts
/** Tetos por tier (spec 2026-07-07): unidades por tenant e funcionários POR unidade. */
export const PLAN_LIMITS = {
  free:  { maxUnits: 1, maxEmployeesPerUnit: 2 },
  basic: { maxUnits: 2, maxEmployeesPerUnit: 5 },
  pro:   { maxUnits: 5, maxEmployeesPerUnit: 15 },
} as const satisfies Record<PlanTier, { maxUnits: number; maxEmployeesPerUnit: number }>;

export function limitsForTier(tier: PlanTier): { maxUnits: number; maxEmployeesPerUnit: number } {
  return PLAN_LIMITS[tier];
}

/** true se o uso atual cabe no tier (validação de downgrade). */
export function usageFitsTier(
  tier: PlanTier,
  usage: { units: number; maxEmployeesInAnyUnit: number },
): boolean {
  const l = PLAN_LIMITS[tier];
  return usage.units <= l.maxUnits && usage.maxEmployeesInAnyUnit <= l.maxEmployeesPerUnit;
}
```

- [ ] **Step 4:** `pnpm --filter @barbearia/schemas test` → PASS. Depois `pnpm --filter @barbearia/schemas build`.
- [ ] **Step 5:** `git add packages/schemas && git commit -m "feat(schemas): PLAN_LIMITS + usageFitsTier (limites por tier)"`

### Task 2: `PlanLimitsService`

**Files:**
- Create: `apps/api/src/billing/plan-limits.service.ts`
- Modify: `apps/api/src/billing/billing.module.ts` (provider+export)
- Test: `apps/api/test/plan-limits.spec.ts`

**Interfaces:**
- Consumes: `limitsForTier`, `usageFitsTier` (Task 1); `Prisma.TransactionClient` (o `ctx.tx` dos controllers).
- Produces:
  - `assertCanAddUnit(tx: Prisma.TransactionClient, tenantId: string): Promise<void>`
  - `assertCanAddEmployee(tx: Prisma.TransactionClient, tenantId: string, barbershopId: string): Promise<void>`
  - `tenantUsage(tx, tenantId): Promise<{ units: number; maxEmployeesInAnyUnit: number }>`
  - `PlanLimitError` = `ConflictException` com body `{ code, resource, limit, current, tier }`.

Nota: até a Task 5 não existe `barbershop.isActive`; o service conta **todas** as barbershops nesta fase e passa a filtrar `isActive: true` na Task 5 (o passo lá cobre isso).

- [ ] **Step 1: Failing test** — `apps/api/test/plan-limits.spec.ts` (padrão de `admin-billing.spec.ts`: prisma direto + `withCtx`):

```ts
import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PlanLimitsService } from '../src/billing/plan-limits.service';

const prisma = new PrismaClient();
const svc = new PlanLimitsService();

let tenantId: string;
let barbershopId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { slug: `pl-${randomUUID().slice(0, 8)}`, name: 'Plan Limits Test' },
  });
  tenantId = tenant.id;
  const org = await prisma.organization.create({ data: { tenantId, name: 'Org' } });
  const loc = await prisma.location.create({
    data: {
      tenantId, organizationId: org.id, name: 'Loc',
      addressLine1: 'Rua X, 1', city: 'SP', state: 'SP', postalCode: '01000-000', country: 'BR',
    },
  });
  const shop = await prisma.barbershop.create({
    data: { tenantId, locationId: loc.id, name: 'Shop 1' },
  });
  barbershopId = shop.id;
  await prisma.subscription.create({
    data: { tenantId, tier: 'free', billingCycle: 'monthly', status: 'active', priceCents: 0 },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe('PlanLimitsService', () => {
  it('free: 2ª unidade estoura com PLAN_LIMIT_REACHED', async () => {
    await expect(svc.assertCanAddUnit(prisma, tenantId)).rejects.toMatchObject({
      response: { code: 'PLAN_LIMIT_REACHED', resource: 'unit', limit: 1, current: 1, tier: 'free' },
    });
  });

  it('free: até 2 funcionários passa, 3º estoura', async () => {
    await expect(svc.assertCanAddEmployee(prisma, tenantId, barbershopId)).resolves.toBeUndefined();
    await prisma.employee.createMany({
      data: [
        { tenantId, barbershopId, displayName: 'B1', role: 'barber' },
        { tenantId, barbershopId, displayName: 'B2', role: 'barber' },
      ],
    });
    await expect(svc.assertCanAddEmployee(prisma, tenantId, barbershopId)).rejects.toThrow(ConflictException);
  });

  it('sem subscription trata como free', async () => {
    await prisma.subscription.delete({ where: { tenantId } });
    await expect(svc.assertCanAddUnit(prisma, tenantId)).rejects.toThrow(ConflictException);
    await prisma.subscription.create({
      data: { tenantId, tier: 'pro', billingCycle: 'monthly', status: 'active', priceCents: 9900 },
    });
  });

  it('pro: 2ª unidade passa; tenantUsage reflete contagens', async () => {
    await expect(svc.assertCanAddUnit(prisma, tenantId)).resolves.toBeUndefined();
    const usage = await svc.tenantUsage(prisma, tenantId);
    expect(usage).toEqual({ units: 1, maxEmployeesInAnyUnit: 2 });
  });
});
```

- [ ] **Step 2:** `pnpm --filter @barbearia/api test -- plan-limits` → FAIL (módulo não existe).
- [ ] **Step 3: Implementar** `plan-limits.service.ts`:

```ts
import { ConflictException, Injectable } from '@nestjs/common';
import { limitsForTier, type PlanTier } from '@barbearia/schemas';
import type { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Enforcement dos tetos do plano (spec 2026-07-07). Recebe o client/tx do
 * chamador: nos controllers admin é o ctx.tx (RLS), nos testes o prisma cru.
 * Sem Subscription → trata como 'free' (não deveria acontecer em prod).
 */
@Injectable()
export class PlanLimitsService {
  private async tierOf(tx: Db, tenantId: string): Promise<PlanTier> {
    const sub = await tx.subscription.findUnique({
      where: { tenantId },
      select: { tier: true },
    });
    return (sub?.tier as PlanTier | undefined) ?? 'free';
  }

  async tenantUsage(
    tx: Db,
    tenantId: string,
  ): Promise<{ units: number; maxEmployeesInAnyUnit: number }> {
    const units = await tx.barbershop.count({ where: { tenantId } });
    const grouped = await tx.employee.groupBy({
      by: ['barbershopId'],
      where: { tenantId, isActive: true },
      _count: { _all: true },
    });
    const maxEmployeesInAnyUnit = grouped.reduce((m, g) => Math.max(m, g._count._all), 0);
    return { units, maxEmployeesInAnyUnit };
  }

  private limitError(
    resource: 'unit' | 'employee',
    limit: number,
    current: number,
    tier: PlanTier,
  ): ConflictException {
    const noun = resource === 'unit' ? 'unidades' : 'funcionários por unidade';
    return new ConflictException({
      code: 'PLAN_LIMIT_REACHED',
      resource,
      limit,
      current,
      tier,
      message: `Seu plano ${tier} permite ${limit} ${noun}. Faça upgrade para adicionar mais.`,
    });
  }

  async assertCanAddUnit(tx: Db, tenantId: string): Promise<void> {
    const tier = await this.tierOf(tx, tenantId);
    const { maxUnits } = limitsForTier(tier);
    const current = await tx.barbershop.count({ where: { tenantId } });
    if (current >= maxUnits) throw this.limitError('unit', maxUnits, current, tier);
  }

  async assertCanAddEmployee(tx: Db, tenantId: string, barbershopId: string): Promise<void> {
    const tier = await this.tierOf(tx, tenantId);
    const { maxEmployeesPerUnit } = limitsForTier(tier);
    const current = await tx.employee.count({
      where: { tenantId, barbershopId, isActive: true },
    });
    if (current >= maxEmployeesPerUnit) {
      throw this.limitError('employee', maxEmployeesPerUnit, current, tier);
    }
  }
}
```

No `billing.module.ts`, adicionar `PlanLimitsService` a `providers` e `exports`.

- [ ] **Step 4:** `pnpm --filter @barbearia/api test -- plan-limits` → PASS.
- [ ] **Step 5:** `git add apps/api/src/billing apps/api/test/plan-limits.spec.ts && git commit -m "feat(billing): PlanLimitsService com tetos de unidade/funcionário por tier"`

### Task 3: Trava de funcionários nos dois controllers

**Files:**
- Modify: `apps/api/src/employees/employees.controller.ts` (create; update quando `isActive` vira true)
- Modify: `apps/api/src/admin/admin-employees.controller.ts` (create; update idem)
- Modify: `apps/api/src/employees/employees.module.ts` e `apps/api/src/admin/admin.module.ts` (importar `BillingModule`; conferir nomes reais dos módulos com `Grep "EmployeesController" apps/api/src --glob "*.module.ts"`)
- Test: `apps/api/test/plan-limits.spec.ts` (append describe)

**Interfaces:**
- Consumes: `PlanLimitsService.assertCanAddEmployee` (Task 2).

- [ ] **Step 1: Failing test** — append no `plan-limits.spec.ts` um describe que instancia `EmployeesController` real (`new EmployeesController(planLimits)` — o construtor hoje é vazio; o teste guia a injeção) e verifica:
  - criar funcionário com tenant free já com 2 ativos → rejects `ConflictException`;
  - `PATCH` reativando (`isActive: true`) um inativo quando a unidade está no teto → rejects `ConflictException`;
  - `PATCH` com `isActive: false` ou update de nome NÃO passa pela trava (resolves).
  Usar `withCtx` (copiar o helper do `admin-billing.spec.ts`) porque esses controllers usam RLS via `ctx.tx`.

```ts
import { EmployeesController } from '../src/employees/employees.controller';
// dentro do describe:
const employeesController = new EmployeesController(svc);

it('create estoura no teto do tier', async () => {
  // tenant free do beforeAll já tem 2 ativos (B1, B2)
  await prisma.subscription.update({ where: { tenantId }, data: { tier: 'free', priceCents: 0 } });
  await expect(
    withCtx(adminId, tenantId, (ctx) =>
      employeesController.create(ctx, { displayName: 'B3', role: 'barber', isActive: true } as never, undefined),
    ),
  ).rejects.toThrow(ConflictException);
});

it('reativar no teto estoura; desativar não', async () => {
  const inactive = await prisma.employee.create({
    data: { tenantId, barbershopId, displayName: 'B4', role: 'barber', isActive: false },
  });
  await expect(
    withCtx(adminId, tenantId, (ctx) => employeesController.update(ctx, inactive.id, { isActive: true })),
  ).rejects.toThrow(ConflictException);
  await expect(
    withCtx(adminId, tenantId, (ctx) => employeesController.update(ctx, inactive.id, { displayName: 'B4x' })),
  ).resolves.toBeDefined();
});
```

(Adicionar no `beforeAll` os atores `adminId` com `appUser` + `tenantMembership` roles `['admin']`, igual `admin-billing.spec.ts`.)

- [ ] **Step 2:** `pnpm --filter @barbearia/api test -- plan-limits` → FAIL (construtor não aceita service / trava não existe).
- [ ] **Step 3: Implementar** — em `employees.controller.ts`:

```ts
import { PlanLimitsService } from '../billing/plan-limits.service';

export class EmployeesController {
  constructor(private readonly planLimits: PlanLimitsService) {}
  // no create(), depois de resolver shopId:
  //   await this.planLimits.assertCanAddEmployee(ctx.tx, tenantId, shopId);
  // no update(), buscar existing com select { id, isActive, barbershopId, tenantId } e:
  //   if (body.isActive === true && !existing.isActive) {
  //     await this.planLimits.assertCanAddEmployee(ctx.tx, existing.tenantId, existing.barbershopId);
  //   }
}
```

Mesma trava em `admin-employees.controller.ts` (`create` depois do `findFirst` da barbershop; `update` na transição `isActive false→true` — o `existing` de lá também precisa passar a selecionar `isActive`, `barbershopId`, `tenantId`). Registrar `BillingModule` nos módulos que declaram esses controllers.

- [ ] **Step 4:** `pnpm --filter @barbearia/api test -- plan-limits` → PASS. Rodar também `pnpm --filter @barbearia/api test` completo (regressões) e `pnpm --filter @barbearia/api typecheck`.
- [ ] **Step 5:** `git add -A apps/api && git commit -m "feat(api): trava de funcionários por unidade nos controllers de employees"`

### Task 4: `POST /admin/subscription/change-plan`

**Files:**
- Modify: `apps/api/src/payment/mercadopago.provider.ts` (novo `updatePreapprovalAmount`; `free_trial` condicional)
- Modify: `apps/api/src/billing/admin-billing.controller.ts`
- Modify: `apps/api/src/billing/billing.module.ts` (controller já registrado? conferir onde `AdminBillingController` é declarado via Grep e garantir `PlanLimitsService` injetável)
- Test: `apps/api/test/admin-billing.spec.ts` (append)

**Interfaces:**
- Consumes: `PlanLimitsService.tenantUsage`, `usageFitsTier`, `priceForTier`, `planForTier` (Task 1/2).
- Produces: endpoint `POST /admin/subscription/change-plan` body `{ tier: 'free'|'basic'|'pro', cardTokenId?: string }` → `{ ok: true, tier, priceCents }`. Ciclo de cobrança é mantido (mudar ciclo = fora de escopo, 400).
- Produces: `MercadoPagoProvider.updatePreapprovalAmount(id: string, amountCents: number): Promise<void>`.

Regras:
1. `tier` igual ao atual → 400.
2. Downgrade (`pro→basic`, `*→free`): `usageFitsTier(alvo, tenantUsage())`; não cabe → 409 `PLAN_LIMIT_REACHED` (o body indica `resource` do primeiro estouro: unidades primeiro, senão funcionários).
3. pago→pago: `mp.updatePreapprovalAmount(sub.mpPreapprovalId, novoPreço)` + update local `{ tier, priceCents }`.
4. pago→free: `mp.cancelPreapproval` + update `{ tier: 'free', priceCents: 0, status: 'active', mpPreapprovalId: null, trialEndsAt: null }`.
5. free→pago: exige `cardTokenId` (400 sem); cria preapproval **sem trial** (`trialDays: 0` → provider omite `free_trial` quando `<= 0`); update `{ tier, priceCents, status: 'active', mpPreapprovalId }`.

- [ ] **Step 1: Failing tests** — append em `admin-billing.spec.ts`:

```ts
describe('POST /admin/subscription/change-plan', () => {
  beforeEach(async () => {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { tier: 'pro', status: 'active', priceCents: 9900, mpPreapprovalId: 'preapproval-test-123' },
    });
    jest.clearAllMocks();
  });

  it('downgrade pro→free com uso dentro do teto: cancela preapproval e zera', async () => {
    const r = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.changePlan(ctx, user, { tier: 'free' }),
    );
    expect(r).toMatchObject({ ok: true, tier: 'free', priceCents: 0 });
    expect(mpMock.cancelPreapproval).toHaveBeenCalledWith('preapproval-test-123');
  });

  it('downgrade com funcionários acima do teto → 409 PLAN_LIMIT_REACHED', async () => {
    // semear barbershop com 3 funcionários ativos (acima do free=2)
    // …criar org/location/barbershop + 3 employees, como em plan-limits.spec…
    await expect(
      withCtx(adminId, tenantId, (ctx, user) => controller.changePlan(ctx, user, { tier: 'free' })),
    ).rejects.toMatchObject({ response: { code: 'PLAN_LIMIT_REACHED' } });
  });

  it('upgrade basic→pro atualiza valor no MP', async () => {
    await prisma.subscription.update({ where: { id: subscriptionId }, data: { tier: 'basic', priceCents: 4900 } });
    const r = await withCtx(adminId, tenantId, (ctx, user) =>
      controller.changePlan(ctx, user, { tier: 'pro' }),
    );
    expect(r).toMatchObject({ ok: true, tier: 'pro', priceCents: 9900 });
    expect(mpMock.updatePreapprovalAmount).toHaveBeenCalledWith('preapproval-test-123', 9900);
  });

  it('free→pago sem cartão → 400; tier igual → 400', async () => {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { tier: 'free', priceCents: 0, mpPreapprovalId: null },
    });
    await expect(
      withCtx(adminId, tenantId, (ctx, user) => controller.changePlan(ctx, user, { tier: 'basic' })),
    ).rejects.toThrow(BadRequestException);
    await expect(
      withCtx(adminId, tenantId, (ctx, user) => controller.changePlan(ctx, user, { tier: 'free' })),
    ).rejects.toThrow(BadRequestException);
  });
});
```

Atualizar `mpMock` com `updatePreapprovalAmount: jest.fn()` e `createPreapproval: jest.fn().mockResolvedValue({ id: 'new-pre', status: 'authorized' })`, e o construtor `new AdminBillingController(mpMock, new PlanLimitsService())`.

- [ ] **Step 2:** `pnpm --filter @barbearia/api test -- admin-billing` → FAIL.
- [ ] **Step 3: Implementar.**

`mercadopago.provider.ts` — no `createPreapproval`, trocar a linha do `free_trial` por spread condicional:

```ts
auto_recurring: {
  frequency: input.frequency,
  frequency_type: input.frequencyType,
  transaction_amount: input.amountCents / 100,
  currency_id: 'BRL',
  ...(input.trialDays > 0
    ? { free_trial: { frequency: input.trialDays, frequency_type: 'days' } }
    : {}),
},
```

Novo método (mesmo shape do `updatePreapprovalCard`):

```ts
async updatePreapprovalAmount(id: string, amountCents: number): Promise<void> {
  const res = await fetch(`${this.baseUrl}/preapproval/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${this.platformToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auto_recurring: { transaction_amount: amountCents / 100, currency_id: 'BRL' },
    }),
  });
  await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`MP updatePreapprovalAmount ${id} → ${res.status}`);
}
```

`admin-billing.controller.ts` — injetar `PlanLimitsService`, adicionar:

```ts
@Post('change-plan')
@HttpCode(HttpStatus.OK)
async changePlan(
  @Tx() ctx: TenantContextValue,
  @CurrentUser() user: AuthenticatedUser,
  @Body() body: { tier?: string; cardTokenId?: string },
) {
  const { tenantId } = await assertTenantAdmin(ctx, user, 'alterar o plano');
  const tier = body.tier as PlanTier;
  if (!tier || !(tier in BILLING_TIERS)) throw new BadRequestException('Tier inválido.');
  const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
  if (!sub) throw new BadRequestException('Assinatura não encontrada.');
  if (sub.tier === tier) throw new BadRequestException('Esse já é o seu plano atual.');

  // Downgrade: o uso atual precisa caber no plano de destino.
  const usage = await this.planLimits.tenantUsage(ctx.tx, tenantId);
  if (!usageFitsTier(tier, usage)) {
    const limits = limitsForTier(tier);
    const resource = usage.units > limits.maxUnits ? 'unit' : 'employee';
    throw new ConflictException({
      code: 'PLAN_LIMIT_REACHED',
      resource,
      limit: resource === 'unit' ? limits.maxUnits : limits.maxEmployeesPerUnit,
      current: resource === 'unit' ? usage.units : usage.maxEmployeesInAnyUnit,
      tier,
      message: 'Desative unidades ou funcionários excedentes antes de fazer downgrade.',
    });
  }

  const cycle = sub.billingCycle as BillingCycle;
  const priceCents = priceForTier(tier, cycle);

  if (tier === 'free') {
    if (sub.mpPreapprovalId) await this.mp.cancelPreapproval(sub.mpPreapprovalId);
    await ctx.tx.subscription.update({
      where: { tenantId },
      data: { tier, priceCents: 0, status: 'active', mpPreapprovalId: null, trialEndsAt: null },
    });
    return { ok: true, tier, priceCents: 0 };
  }

  if (sub.mpPreapprovalId) {
    await this.mp.updatePreapprovalAmount(sub.mpPreapprovalId, priceCents);
    await ctx.tx.subscription.update({ where: { tenantId }, data: { tier, priceCents } });
    return { ok: true, tier, priceCents };
  }

  // free → pago: precisa de cartão; sem novo trial (anti-abuso).
  if (!body.cardTokenId) throw new BadRequestException('Cartão obrigatório para planos pagos.');
  const owner = await ctx.tx.appUser.findUnique({ where: { id: user.id }, select: { email: true } });
  if (!owner?.email) throw new BadRequestException('Conta sem email.');
  const tenant = await ctx.tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const plan = planForTier(tier, cycle);
  const pre = await this.mp.createPreapproval({
    reason: `Assinatura Navalha — ${tenant?.name ?? 'Barbearia'}`,
    externalReference: tenantId,
    payerEmail: owner.email,
    cardTokenId: body.cardTokenId,
    amountCents: plan.priceCents,
    frequency: plan.mpFrequency,
    frequencyType: plan.mpFrequencyType,
    trialDays: 0,
    backUrl: `${process.env.PUBLIC_WEB_URL ?? 'https://appbarbeariab.com'}/admin/assinatura`,
  });
  await ctx.tx.subscription.update({
    where: { tenantId },
    data: { tier, priceCents, status: 'active', mpPreapprovalId: pre.id },
  });
  return { ok: true, tier, priceCents };
}
```

(Imports: `BILLING_TIERS, priceForTier, planForTier, limitsForTier, usageFitsTier, type PlanTier, type BillingCycle` de `@barbearia/schemas`; `ConflictException` do nest; `PlanLimitsService`.)

- [ ] **Step 4:** `pnpm --filter @barbearia/api test -- admin-billing` → PASS; suíte inteira + typecheck.
- [ ] **Step 5:** `git add -A apps/api && git commit -m "feat(billing): endpoint change-plan com validação de downgrade e MP"`

---

## Fase 2 — Multi-unidade no admin

### Task 5: Migration `barbershops.slug` + `is_active`

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model Barbershop)
- Create: `apps/api/prisma/migrations/20260707120000_barbershop_slug_active/migration.sql`
- Modify: `apps/api/src/billing/plan-limits.service.ts` + `apps/api/test/plan-limits.spec.ts` (contagens passam a filtrar `isActive: true`)

**Interfaces:**
- Produces: `Barbershop.slug: string @unique`, `Barbershop.isActive: boolean @default(true)`.

- [ ] **Step 1:** No `schema.prisma`, dentro de `model Barbershop`, após `name`:

```prisma
  /// Slug público da unidade (multi-unidade, spec 2026-07-07). Backfill: slug do tenant.
  slug        String   @unique
  /// Unidade desativada não conta no limite nem aparece no público.
  isActive    Boolean  @default(true) @map("is_active")
```

- [ ] **Step 2:** Migration SQL (manual, pra controlar o backfill — mesmo padrão dos raw SQL existentes):

```sql
ALTER TABLE barbershops ADD COLUMN slug TEXT;
ALTER TABLE barbershops ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill: 1ª unidade herda o slug do tenant; extras (não deveriam existir) ganham sufixo -2, -3…
WITH ranked AS (
  SELECT b.id, t.slug AS tslug,
         ROW_NUMBER() OVER (PARTITION BY b.tenant_id ORDER BY b.created_at) AS rn
  FROM barbershops b JOIN tenants t ON t.id = b.tenant_id
)
UPDATE barbershops b
SET slug = CASE WHEN r.rn = 1 THEN r.tslug ELSE r.tslug || '-' || r.rn END
FROM ranked r WHERE r.id = b.id;

ALTER TABLE barbershops ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX barbershops_slug_key ON barbershops(slug);
```

- [ ] **Step 3:** Aplicar no DB de teste: `pnpm --filter @barbearia/api test:db:migrate` e `pnpm --filter @barbearia/api prisma:generate`. Ajustar `plan-limits.spec.ts` (barbershop create agora precisa de `slug: \`shop-${randomUUID().slice(0,8)}\``) e todos os `prisma.barbershop.create` de outros specs que quebrarem (rodar a suíte pra achar).
- [ ] **Step 4:** No `PlanLimitsService`, os dois `barbershop.count` ganham `isActive: true` no where; em `tenantUsage`, o groupBy de employees ganha `barbershop: { isActive: true }` no where. Teste novo no spec: desativar a barbershop (`isActive: false`) → `assertCanAddUnit` volta a passar no free. `pnpm --filter @barbearia/api test` → PASS.
- [ ] **Step 5:** Onboarding: em `onboarding.controller.ts`, o `barbershop.create` ganha `slug: body.tenant.slug` (herda o slug do tenant). Rodar `pnpm --filter @barbearia/api test -- billing-onboarding` → PASS.
- [ ] **Step 6:** `git add -A apps/api && git commit -m "feat(api): barbershops.slug + is_active (migration com backfill)"`

### Task 6: Módulo `units` (API admin)

**Files:**
- Create: `apps/api/src/units/units.module.ts`, `apps/api/src/units/admin-units.controller.ts`
- Modify: `apps/api/src/app.module.ts` (registrar `UnitsModule`)
- Modify: `packages/schemas/src/` — criar `units.ts` com schemas Zod + export no index
- Test: `apps/api/test/admin-units.spec.ts`

**Interfaces:**
- Consumes: `PlanLimitsService.assertCanAddUnit` (Task 2), colunas da Task 5.
- Produces (consumido pela web na Task 8/9):
  - `GET /admin/units` → `{ units: UnitDto[], limit: number, tier: PlanTier }` onde `UnitDto = { id, slug, name, isActive, addressLine1, city, employeeCount }`
  - `POST /admin/units` body `CreateUnitInput = { name, slug, addressLine1, addressLine2?, city, state, postalCode }` → `UnitDto` (cria Location + Barbershop; `country: 'BR'`, `lateCancelFeePct: 50`)
  - `PATCH /admin/units/:id` body parcial + `{ isActive?: boolean }` → `UnitDto`
- Schemas Zod em `@barbearia/schemas`: `createUnitSchema`, `updateUnitSchema` (slug: `z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/)` — mesmo formato do slug de tenant em `onboarding.ts`; conferir e reusar a regex de lá).

- [ ] **Step 1: Failing test** `admin-units.spec.ts` (padrão `withCtx` + controller real, `new AdminUnitsController(new PlanLimitsService())`):
  - admin de tenant `basic` com 1 unidade cria a 2ª → 201, `UnitDto.slug` correto;
  - 3ª unidade → `ConflictException` `PLAN_LIMIT_REACHED resource:'unit'`;
  - slug já usado por outra **barbershop** OU por outro **tenant** → `ConflictException` (mensagem de slug);
  - `PATCH` desativa (`isActive:false`) e a lista reflete; reativar com teto cheio → 409;
  - user sem role admin → `ForbiddenException`.

```ts
// esqueleto do teste — seed igual plan-limits.spec (tenant basic, org, location, shop slug único)
it('cria 2ª unidade no basic', async () => {
  const r = await withCtx(adminId, tenantId, (ctx, user) =>
    controller.create(ctx, user, {
      name: 'Filial Centro', slug: `filial-${suffix}`,
      addressLine1: 'Rua Y, 2', city: 'SP', state: 'SP', postalCode: '01000-000',
    }),
  );
  expect(r.slug).toBe(`filial-${suffix}`);
});
```

- [ ] **Step 2:** rodar → FAIL. 
- [ ] **Step 3: Implementar** `admin-units.controller.ts`:

```ts
import {
  Body, ConflictException, Controller, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CreateUnitInput, createUnitSchema, limitsForTier, type PlanTier,
  type UpdateUnitInput, updateUnitSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { PlanLimitsService } from '../billing/plan-limits.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/units')
export class AdminUnitsController {
  constructor(private readonly planLimits: PlanLimitsService) {}

  /** Slug de unidade não pode colidir com outra unidade NEM com um tenant (namespace público único). */
  private async assertSlugFree(ctx: TenantContextValue, slug: string, ignoreShopId?: string) {
    const [shop, tenant] = await Promise.all([
      ctx.tx.barbershop.findUnique({ where: { slug }, select: { id: true } }),
      // tenants é RLS-protegido a membros; usa raw count sem RETURNING de linha
      ctx.tx.$queryRaw<[{ n: bigint }]>`SELECT count(*)::bigint n FROM tenants WHERE slug = ${slug}`,
    ]);
    const tenantTaken = Number(tenant[0]?.n ?? 0) > 0;
    if ((shop && shop.id !== ignoreShopId) || tenantTaken) {
      throw new ConflictException('Esse slug já está em uso. Escolha outro.');
    }
  }

  @Get()
  async list(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'ver unidades');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId }, select: { tier: true } });
    const tier = ((sub?.tier as PlanTier | undefined) ?? 'free') satisfies PlanTier;
    const shops = await ctx.tx.barbershop.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, slug: true, name: true, isActive: true,
        location: { select: { addressLine1: true, city: true } },
        _count: { select: { employees: { where: { isActive: true } } } },
      },
    });
    return {
      units: shops.map((s) => ({
        id: s.id, slug: s.slug, name: s.name, isActive: s.isActive,
        addressLine1: s.location.addressLine1, city: s.location.city,
        employeeCount: s._count.employees,
      })),
      limit: limitsForTier(tier).maxUnits,
      tier,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createUnitSchema)) body: CreateUnitInput,
  ) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'criar unidades');
    await this.planLimits.assertCanAddUnit(ctx.tx, tenantId);
    await this.assertSlugFree(ctx, body.slug);
    const org = await ctx.tx.organization.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
    if (!org) throw new NotFoundException('Organização não encontrada.');
    const location = await ctx.tx.location.create({
      data: {
        tenantId, organizationId: org.id, name: body.name,
        addressLine1: body.addressLine1, addressLine2: body.addressLine2 ?? null,
        city: body.city, state: body.state, postalCode: body.postalCode, country: 'BR',
      },
    });
    const shop = await ctx.tx.barbershop.create({
      data: { tenantId, locationId: location.id, name: body.name, slug: body.slug },
    });
    return {
      id: shop.id, slug: shop.slug, name: shop.name, isActive: shop.isActive,
      addressLine1: location.addressLine1, city: location.city, employeeCount: 0,
    };
  }

  @Patch(':id')
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) body: UpdateUnitInput,
  ) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'editar unidades');
    const existing = await ctx.tx.barbershop.findFirst({
      where: { id },
      select: { id: true, isActive: true, locationId: true },
    });
    if (!existing) throw new NotFoundException('Unidade não encontrada.');
    if (body.isActive === true && !existing.isActive) {
      await this.planLimits.assertCanAddUnit(ctx.tx, tenantId);
    }
    if (body.slug) await this.assertSlugFree(ctx, body.slug, existing.id);
    if (body.addressLine1 !== undefined || body.city !== undefined || body.state !== undefined
        || body.postalCode !== undefined || body.addressLine2 !== undefined) {
      await ctx.tx.location.update({
        where: { id: existing.locationId },
        data: {
          ...(body.addressLine1 !== undefined && { addressLine1: body.addressLine1 }),
          ...(body.addressLine2 !== undefined && { addressLine2: body.addressLine2 ?? null }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.state !== undefined && { state: body.state }),
          ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        },
      });
    }
    const shop = await ctx.tx.barbershop.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      select: {
        id: true, slug: true, name: true, isActive: true,
        location: { select: { addressLine1: true, city: true } },
        _count: { select: { employees: { where: { isActive: true } } } },
      },
    });
    return {
      id: shop.id, slug: shop.slug, name: shop.name, isActive: shop.isActive,
      addressLine1: shop.location.addressLine1, city: shop.location.city,
      employeeCount: shop._count.employees,
    };
  }
}
```

`packages/schemas/src/units.ts` (reusar a regex de slug do `onboarding.ts` — importar ou extrair pra const compartilhada):

```ts
import { z } from 'zod';
import { slugSchema } from './onboarding'; // se não for exportado, exportar de lá

export const createUnitSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().length(2),
  postalCode: z.string().min(8).max(9),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export interface UnitDto {
  id: string; slug: string; name: string; isActive: boolean;
  addressLine1: string; city: string; employeeCount: number;
}
export interface UnitsResponse { units: UnitDto[]; limit: number; tier: 'free' | 'basic' | 'pro' }
```

`units.module.ts` importa `BillingModule`; registrar em `app.module.ts`.

- [ ] **Step 4:** `pnpm --filter @barbearia/schemas build && pnpm --filter @barbearia/api test -- admin-units` → PASS; typecheck ambos.
- [ ] **Step 5:** `git add -A apps/api packages/schemas && git commit -m "feat(api): módulo admin/units — criar/editar unidades com teto do plano"`

### Task 7: `?barbershopId=` explícito nos controllers admin restantes

**Files:**
- Modify: `apps/api/src/barbershop-hours/barbershop-hours.controller.ts`
- Modify: `apps/api/src/admin/admin-services.controller.ts`
- Modify: `apps/api/src/admin/admin-appointments.controller.ts`, `admin-time-off.controller.ts`, `admin-employees.controller.ts` (onde houver `findFirst` de barbershop ou listagem tenant-wide que precise de escopo por unidade — mapear com `Grep "barbershop.findFirst" apps/api/src`)
- Test: appends nos specs existentes dos controllers alterados (ex.: `admin-services.controller.spec.ts`)

**Interfaces:**
- Produces: todos aceitam `@Query('barbershopId')` opcional; sem ele, comportamento atual (findFirst) — retrocompatível com mobile-business.

- [ ] **Step 1:** Extrair o helper `resolveBarbershopId` do `employees.controller.ts` (que já implementa exatamente esse padrão) pra `apps/api/src/tenancy/resolve-barbershop.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TenantContextValue } from './tenant-context';

/** Resolve a unidade alvo: explícita (validando que existe no tenant via RLS) ou a 1ª. */
export async function resolveBarbershopId(
  ctx: TenantContextValue,
  explicit?: string,
): Promise<string> {
  if (explicit) {
    const found = await ctx.tx.barbershop.findUnique({ where: { id: explicit }, select: { id: true } });
    if (!found) throw new NotFoundException('Barbershop não encontrado.');
    return found.id;
  }
  const first = await ctx.tx.barbershop.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!first) throw new BadRequestException('Nenhuma barbershop nesse tenant.');
  return first.id;
}
```

- [ ] **Step 2:** Failing tests: em cada spec de controller alterado, um caso "com `barbershopId` da unidade B, lista só recursos da unidade B" (semear 2ª barbershop + recurso em cada uma).
- [ ] **Step 3:** Trocar cada `barbershop.findFirst` por `resolveBarbershopId(ctx, barbershopId)` e usar o id no where das queries do controller (services por `barbershopId`, hours idem, appointments idem). `employees.controller.ts` passa a usar o helper compartilhado (deletar o método privado).
- [ ] **Step 4:** Suíte completa + typecheck → PASS.
- [ ] **Step 5:** `git add -A apps/api && git commit -m "feat(api): escopo por unidade (?barbershopId) nos controllers admin"`

### Task 8: Web — `ActiveUnitProvider` + seletor no shell

**Files:**
- Create: `apps/web/src/lib/active-unit.tsx`
- Modify: `apps/web/src/app/admin/_shell.tsx` (dropdown) e `apps/web/src/app/admin/layout.tsx` (envolver com o provider — conferir onde `ActiveTenantProvider` é montado e colocar o `ActiveUnitProvider` logo dentro)

**Interfaces:**
- Consumes: `GET /admin/units` (Task 6).
- Produces: hook `useActiveUnit(): { units: UnitDto[]; activeUnit: UnitDto; setActiveUnitId: (id: string) => void; limit: number; tier: string; refresh: () => Promise<void> }`.

- [ ] **Step 1:** Implementar `active-unit.tsx` no mesmo padrão do `active-tenant.tsx`:

```tsx
'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import type { UnitDto, UnitsResponse } from '@barbearia/schemas';
import { api } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

interface ActiveUnitContextValue {
  units: UnitDto[];
  activeUnit: UnitDto;
  setActiveUnitId: (id: string) => void;
  limit: number;
  tier: string;
  refresh: () => Promise<void>;
}

const ActiveUnitContext = createContext<ActiveUnitContextValue | null>(null);

export function useActiveUnit(): ActiveUnitContextValue {
  const ctx = useContext(ActiveUnitContext);
  if (!ctx) throw new Error('useActiveUnit() must be used inside <ActiveUnitProvider>');
  return ctx;
}

const STORAGE_KEY = 'navalha.activeUnitId';

export function ActiveUnitProvider({ children }: { children: ReactNode }) {
  const { tenant } = useActiveTenant();
  const [data, setData] = useState<UnitsResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<UnitsResponse>('/admin/units', { tenantId: tenant.id });
      setData(r);
      const stored = localStorage.getItem(STORAGE_KEY);
      const valid = r.units.find((u) => u.id === stored && u.isActive);
      setActiveId(valid?.id ?? r.units.find((u) => u.isActive)?.id ?? r.units[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar unidades');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-destructive">{error}</div>;
  }
  if (!data || !activeId) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  }
  const activeUnit = data.units.find((u) => u.id === activeId) ?? data.units[0]!;

  function setActiveUnitId(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  }

  return (
    <ActiveUnitContext.Provider
      value={{ units: data.units, activeUnit, setActiveUnitId, limit: data.limit, tier: data.tier, refresh: load }}
    >
      {children}
    </ActiveUnitContext.Provider>
  );
}
```

- [ ] **Step 2:** No `_shell.tsx`, ao lado do nome do tenant, dropdown de unidade (só quando `units.length > 1`) usando `<select>` simples estilizado (ou o componente Select do ui/ se existir — `ls apps/web/src/components/ui`):

```tsx
const { units, activeUnit, setActiveUnitId } = useActiveUnit();
// no header, sob o nome do tenant:
{units.length > 1 && (
  <select
    value={activeUnit.id}
    onChange={(e) => setActiveUnitId(e.target.value)}
    className="mt-1 rounded-md border bg-background px-2 py-1 text-sm"
  >
    {units.filter((u) => u.isActive).map((u) => (
      <option key={u.id} value={u.id}>{u.name}</option>
    ))}
  </select>
)}
```

Adicionar `{ href: '/admin/unidades', label: 'Unidades' }` ao `navItems` (antes de 'Assinatura').

- [ ] **Step 3:** Verificar: `pnpm --filter web typecheck && pnpm --filter web lint` (conferir o nome real do pacote web em `apps/web/package.json`; usar o nome que estiver lá). Subir `pnpm --filter web dev` e conferir que o admin carrega com 1 unidade (sem dropdown).
- [ ] **Step 4:** `git add -A apps/web && git commit -m "feat(web): ActiveUnitProvider + seletor de unidade no shell admin"`

### Task 9: Web — página `/admin/unidades`

**Files:**
- Create: `apps/web/src/app/admin/unidades/page.tsx`

**Interfaces:**
- Consumes: `GET/POST/PATCH /admin/units`, `useActiveUnit`, `useActiveTenant`.

- [ ] **Step 1:** Página no padrão do `team/page.tsx` (Card + react-hook-form + zodResolver com `createUnitSchema`):
  - Header: "Unidades — X de Y do plano {tier}".
  - Lista: nome, slug (com link público `/b/{slug}` copiável), endereço, nº de funcionários, badge Inativa, botões Editar/Desativar/Reativar.
  - Botão "Nova unidade" desabilitado quando `unidadesAtivas >= limit`, com texto "Limite do plano atingido" + link pra `/admin/assinatura`.
  - Submit: `api.post('/admin/units', values, { tenantId: tenant.id })`; erro 409 `PLAN_LIMIT_REACHED` → mensagem com CTA de upgrade; 409 slug → mensagem no campo slug. Após criar/editar: `await refresh()` (do `useActiveUnit`).
  - Form fields: name, slug, addressLine1, addressLine2, city, state (2 letras), postalCode — mesmos componentes `FormField/Input` do team.
- [ ] **Step 2:** typecheck + lint web → PASS; manual: criar 2ª unidade num tenant basic dev, ver contador e dropdown aparecerem.
- [ ] **Step 3:** `git add -A apps/web && git commit -m "feat(web): página /admin/unidades com teto do plano e CTA de upgrade"`

### Task 10: Web — páginas admin passam a unidade ativa

**Files:**
- Modify: `apps/web/src/app/admin/team/page.tsx`, `services/page.tsx`, `hours/page.tsx`, `agenda/page.tsx` (mapear as chamadas com `Grep "api.get\|api.post\|api.patch" apps/web/src/app/admin`)

**Interfaces:**
- Consumes: `useActiveUnit().activeUnit.id`; endpoints com `?barbershopId=` (Task 7).

- [ ] **Step 1:** Em cada página, importar `useActiveUnit` e acrescentar `barbershopId` nas URLs de list/create (padrão team: `/employees?includeInactive=true&barbershopId=${activeUnit.id}`; create idem). Incluir `activeUnit.id` nos deps dos `useEffect` de refresh.
- [ ] **Step 2:** typecheck + lint → PASS. Manual: com 2 unidades, alternar o dropdown e ver equipe/serviços/horários trocarem.
- [ ] **Step 3:** `git add -A apps/web && git commit -m "feat(web): páginas admin escopadas pela unidade ativa"`

### Task 11: Assinatura — UI de troca de plano

**Files:**
- Modify: `apps/web/src/app/admin/assinatura/page.tsx`

**Interfaces:**
- Consumes: `POST /admin/subscription/change-plan` (Task 4), `BILLING_TIERS`, `PLAN_LIMITS` de `@barbearia/schemas`, `MpCardFields` (já usado na página pra update de cartão).

- [ ] **Step 1:** Seção "Mudar de plano": 3 cards (Free/Basic/Pro) com preço do ciclo atual e limites ("1 unidade · 2 barbeiros/unidade" via `PLAN_LIMITS`), badge "Plano atual". Clique:
  - pago→pago / pago→free: `confirm()` + `api.post('/admin/subscription/change-plan', { tier }, { tenantId })`;
  - free→pago: abre o bloco de cartão (mesmo `MpCardFields` do update de cartão) e envia `{ tier, cardTokenId }`;
  - erro 409 `PLAN_LIMIT_REACHED`: mostrar `err.message` da API (já traz a orientação de desativar excedentes).
- [ ] **Step 2:** typecheck + lint → PASS; manual no dev com MP sandbox.
- [ ] **Step 3:** `git add -A apps/web && git commit -m "feat(web): troca de plano na página de assinatura com limites por tier"`

---

## Fase 3 — Público por unidade

### Task 12: Resolução dual de slug + público por unidade

**Files:**
- Modify: `apps/api/src/slots/slots.repository.ts` (novo `resolvePublicTarget`)
- Modify: `apps/api/src/slots/public-tenants.controller.ts`, `slots.controller.ts`, `booking.controller.ts`, `public-coupons.controller.ts`, `public-promotions.controller.ts` (mapear consumidores com `Grep "resolveTenant" apps/api/src`)
- Test: `apps/api/test/public-units.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface PublicTarget {
  tenant: { id: string; slug: string; name: string; timezone: string; status: string;
            phoneE164: string | null; addressLine: string | null; instagramHandle: string | null };
  /** Unidade resolvida — null quando o slug do tenant tem várias unidades (modo seletor). */
  barbershop: { id: string; slug: string; name: string } | null;
  /** Preenchido só no modo seletor. */
  units: Array<{ slug: string; name: string; addressLine1: string; city: string }>;
}
async resolvePublicTarget(slug: string): Promise<PublicTarget>
```

Regras: (1) `barbershops.slug` bate e `isActive` → tenant + essa unidade; (2) senão `tenants.slug` → 1 unidade ativa: resolve pra ela; várias: `barbershop: null` + `units`; (3) nada → 404. `resolveTenant` atual vira wrapper (`return (await this.resolvePublicTarget(slug)).tenant`) pra não quebrar consumidores que só precisam do tenant.

- [ ] **Step 1: Failing test** `public-units.spec.ts` com `SlotsRepository` real (prisma direto): semear tenant com 2 unidades ativas + 1 inativa; casos: slug de unidade → resolve com `barbershop.id` certo; slug do tenant → modo seletor com 2 units (a inativa fora); tenant com 1 unidade → resolve direto; slug inexistente → `NotFoundException`; unidade inativa via slug próprio → 404.
- [ ] **Step 2:** FAIL. **Step 3:** implementar `resolvePublicTarget` (queries: `barbershop.findUnique({ where: { slug }, include tenant })`; fallback `tenant.findUnique({ where: { slug } })` + `barbershop.findMany({ where: { tenantId, isActive: true }, include location })`).
- [ ] **Step 4:** `public-tenants.controller.ts`:
  - `get()` usa `resolvePublicTarget`; resposta ganha `unit: { slug, name } | null` e `units: [...] | null` (selector);
  - `listServices`/`listEmployees`/`listPromotions`/`listReviews`: quando `barbershop` resolvido, where ganha `barbershopId: target.barbershop.id` (services e employees têm a coluna; promotions/reviews conferir no schema — reviews tem `barbershopId`; promotions é tenant-scoped, manter por tenant); quando modo seletor, retornar `[]` (a UI manda escolher unidade antes).
  - `slots.controller.ts`/`booking.controller.ts`: após `resolvePublicTarget`, validar que `service.barbershopId === target.barbershop.id` quando unidade resolvida (senão 404 'Serviço não encontrado.'); modo seletor → 400 'Escolha uma unidade.'.
- [ ] **Step 5:** suíte completa (regressão: `slots.service.spec`, `subscription-gating.spec`, booking) → PASS. Commit: `git commit -am "feat(api): resolução pública por slug de unidade com fallback pro tenant"`
 
### Task 13: Discover por unidade

**Files:**
- Modify: `apps/api/src/discover/discover.controller.ts`
- Modify: `packages/schemas` (DiscoverItem: `slug` passa a ser o slug da unidade; opcional `unitName`)
- Test: append em spec existente de discover se houver (Grep `discover` em apps/api/test); senão criar `discover-units.spec.ts` com 1 tenant/2 unidades → 2 itens

- [ ] **Step 1:** teste: tenant `listedPublicly` com 2 unidades ativas aparece como 2 itens, cada um com slug da unidade e endereço da sua Location; unidade inativa não aparece.
- [ ] **Step 2:** trocar a query base de `tenant.findMany` para `barbershop.findMany({ where: { isActive: true, tenant: { listedPublicly: true, status: 'active' } }, select: { id, slug, name, tenantId, location: { addressLine1, city }, tenant: { name } } })`; groupBys de rating/preço/funcionários passam de `by: ['tenantId']` pra `by: ['barbershopId']` (reviews/services/employees têm a coluna); promotions continua por tenant (`tenantId in`). `DiscoverItem.name` = nome da unidade (ou `tenant.name` se 1 unidade — simplificar: sempre nome da unidade, que no mono-unidade é igual ao da barbearia). `addressLine` = `location.addressLine1 • city`.
- [ ] **Step 3:** suíte + typecheck → PASS. `git commit -am "feat(api): discover lista unidades (não tenants)"`

### Task 14: Web pública + landing

**Files:**
- Modify: `apps/web/src/app/b/[slug]/…` (localizar com `Glob apps/web/src/app/b/**`) — seletor de unidade
- Modify: `apps/web/src/lib/public-api.ts` (tipos com `unit`/`units`)
- Modify: `apps/web/src/components/landing/pricing.tsx` — linhas de limite por tier

- [ ] **Step 1:** Na página pública: se a resposta de `GET /public/tenants/:slug` vier com `units` (modo seletor), renderizar lista de cards (nome + endereço) linkando pra `/b/{unit.slug}`; senão fluxo atual.
- [ ] **Step 2:** `pricing.tsx`: adicionar aos features de cada tier "1 unidade · até 2 barbeiros" / "2 unidades · até 5 barbeiros por unidade" / "5 unidades · até 15 barbeiros por unidade" (usar `PLAN_LIMITS` importado, não hardcode).
- [ ] **Step 3:** typecheck + lint + manual (`/b/slug-do-tenant` com 2 unidades mostra seletor; com 1 vai direto). `git commit -am "feat(web): seletor público de unidade + limites na landing"`

### Task 15: mobile-customer — discover/booking por unidade

**Files:**
- Modify: onde o app consome `DiscoverItem` e `GET /public/tenants/:slug` (mapear com `Grep "public/tenants\|discover" apps/mobile-customer/src`)

- [ ] **Step 1:** Atualizar tipos locais (se duplicados) pra incluir `unit`/`units`; na tela de detalhe, se `units` vier, listar unidades e navegar pro slug da unidade (mesma tela com slug novo). Discover já recebe slug de unidade — sem mudança de navegação.
- [ ] **Step 2:** `pnpm --filter mobile-customer typecheck` (conferir nome real do pacote) + smoke no Expo web se disponível.
- [ ] **Step 3:** `git commit -am "feat(mobile-customer): suporte a unidades no discover e página da barbearia"`

### Task 16: Verificação final

- [ ] `pnpm --filter @barbearia/schemas test && pnpm --filter @barbearia/api test` → tudo PASS.
- [ ] `pnpm -r typecheck` e `pnpm -r lint` → PASS.
- [ ] Invocar o skill `verify`: fluxo manual end-to-end no dev — onboarding basic → criar 2ª unidade → 3ª bloqueada (409 + CTA) → criar 6º funcionário na unidade bloqueado → downgrade pra free bloqueado → desativar unidade/funcionários → downgrade ok → link público da 2ª unidade agenda de ponta a ponta.
- [ ] Commit final se sobrar working tree sujo; **sem push**.
