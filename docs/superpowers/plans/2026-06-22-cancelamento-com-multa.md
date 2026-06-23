# Cancelamento com multa (late-cancel fee) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cancelamento <24h cobrando uma multa (% por barbearia), calculando e registrando o reembolso (preço − multa); estorno real no PSP fica pro go-live.

**Architecture:** Campo `lateCancelFeePct` na barbearia (migration). O endpoint de cancelar deixa de bloquear <24h, calcula a multa sobre o preço do serviço, registra no pagamento (`cancelFeeCents`) e chama `PaymentService.refund` (mock = no-op). O cliente vê multa/reembolso (calculados pelo servidor e expostos no item de agendamento) antes de confirmar no `CancelModal`.

**Tech Stack:** NestJS + Prisma (Postgres local via Docker), `@barbearia/schemas` (Zod), Next.js (web admin/onboarding), Expo/React Native (mobile-customer). Testes: jest (api) no padrão `me-customer.controller.spec.ts`.

## Global Constraints

- Multa = `round(appointment.priceCents × lateCancelFeePct / 100)`; aplicada só quando `now > startAt − 24h`. ≥24h → multa 0, reembolso integral.
- Reembolso efetivo = `payment.amountCents − cancelFeeCents`. Estorno real no Mercado Pago NÃO entra (mock `provider.refund` é no-op) — go-live.
- `lateCancelFeePct`: inteiro 0–100, default 50, por barbearia.
- DB de dev = Postgres local (`postgresql://neondb_owner:postgres@localhost:55432/neondb`); rodar migration com `pnpm --filter @barbearia/api test:db:migrate` (ou prisma migrate dev). Testes: `pnpm --filter @barbearia/api test`.
- Commits frequentes, um por task, sem push. typecheck+lint verdes ao fim de cada task.

---

## File Structure

- `apps/api/prisma/schema.prisma` (modificar) — `lateCancelFeePct` em Barbershop, `cancelFeeCents` em Payment.
- `apps/api/prisma/migrations/<ts>_late_cancel_fee/migration.sql` (criar via prisma migrate).
- `packages/schemas/src/onboarding.ts` + `admin-tenant-profile.ts` (modificar) — `lateCancelFeePct`.
- `packages/schemas/src/me-customer-appointments.ts` (modificar) — bloco `cancellation`.
- `apps/api/src/payment/payment.service.ts` (modificar) — `refund(appointmentId, feeCents)`.
- `apps/api/src/me/me-customer-appointments.controller.ts` (modificar) — cancel sem bloqueio + preview.
- `apps/api/src/onboarding/onboarding.controller.ts` + `admin/admin-tenant-profile.controller.ts` (modificar) — persistir/editar o pct.
- `apps/web/src/app/onboarding/page.tsx` + `apps/web/src/app/admin/perfil/page.tsx` (modificar) — UI do pct.
- `apps/mobile-customer/app/(app)/meus-agendamentos.tsx` (modificar) — copy do `CancelModal`.
- `apps/api/test/cancel-fee.spec.ts` (criar) — testes de integração.

---

## Task 1: Migration — campos de multa

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model Barbershop ~135, model Payment ~370)
- Create: migration via prisma

**Interfaces:**
- Produces: `barbershop.lateCancelFeePct: number` (default 50), `payment.cancelFeeCents: number` (default 0).

- [ ] **Step 1: Adicionar campo em Barbershop**

Em `model Barbershop`, após `ratingCount`:
```prisma
  /// Multa de cancelamento tardio (<24h), % do preço do serviço. ADR-016.
  lateCancelFeePct Int     @default(50) @map("late_cancel_fee_pct")
```

- [ ] **Step 2: Adicionar campo em Payment**

Em `model Payment`, após `platformFeeCents`:
```prisma
  /// Multa retida no cancelamento tardio (reembolso = amountCents - cancelFeeCents).
  cancelFeeCents    Int       @default(0) @map("cancel_fee_cents")
```

- [ ] **Step 3: Gerar a migration**

Run:
```bash
cd apps/api
DATABASE_URL='postgresql://neondb_owner:postgres@localhost:55432/neondb' DIRECT_URL='postgresql://neondb_owner:postgres@localhost:55432/neondb' npx prisma migrate dev --name late_cancel_fee
```
Expected: cria `prisma/migrations/<ts>_late_cancel_fee/` e aplica no DB local.

- [ ] **Step 4: Verificar colunas**

Run:
```bash
docker exec barbearia-test-db psql -U neondb_owner -d neondb -c "\d barbershops" | grep late_cancel_fee_pct
docker exec barbearia-test-db psql -U neondb_owner -d neondb -c "\d payments" | grep cancel_fee_cents
```
Expected: ambas as colunas aparecem.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): schema de multa de cancelamento (lateCancelFeePct, cancelFeeCents)"
```

---

## Task 2: Schemas compartilhados

**Files:**
- Modify: `packages/schemas/src/onboarding.ts`
- Modify: `packages/schemas/src/admin-tenant-profile.ts`
- Modify: `packages/schemas/src/me-customer-appointments.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `lateCancelFeePct` em onboarding (barbershop) e no update de perfil — `z.coerce.number().int().min(0).max(100).default(50)`.
  - `MyCustomerAppointmentItem.cancellation: { isLate: boolean; feeCents: number; refundCents: number }`.

- [ ] **Step 1: Ler os 3 arquivos e localizar os pontos de extensão**

Run: `sed -n '1,60p' packages/schemas/src/onboarding.ts packages/schemas/src/admin-tenant-profile.ts packages/schemas/src/me-customer-appointments.ts`
Anotar onde fica o objeto `barbershop` no onboarding, o schema de update de perfil, e a interface `MyCustomerAppointmentItem`.

- [ ] **Step 2: Onboarding — adicionar `lateCancelFeePct` no objeto barbershop**

No objeto `barbershop` do `createTenantOnboardingSchema`, adicionar:
```ts
    lateCancelFeePct: z.coerce.number().int().min(0).max(100).default(50),
```

- [ ] **Step 3: Admin tenant-profile — permitir editar `lateCancelFeePct`**

No schema de update (ex. `updateTenantProfileSchema`), adicionar opcional:
```ts
  lateCancelFeePct: z.coerce.number().int().min(0).max(100).optional(),
```

- [ ] **Step 4: me-customer-appointments — bloco cancellation**

Na interface `MyCustomerAppointmentItem`, adicionar:
```ts
  cancellation: {
    isLate: boolean;
    feeCents: number;
    refundCents: number;
  };
```

- [ ] **Step 5: Build + typecheck**

Run: `pnpm --filter @barbearia/schemas build && pnpm --filter @barbearia/schemas typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas/src
git commit -m "feat(schemas): lateCancelFeePct + bloco cancellation no agendamento"
```

---

## Task 3: PaymentService.refund com multa

**Files:**
- Modify: `apps/api/src/payment/payment.service.ts` (método `refund`, ~linha 334)
- Test: `apps/api/test/cancel-fee.spec.ts` (criar — parte 1)

**Interfaces:**
- Consumes: `payment.cancelFeeCents` (Task 1).
- Produces: `refund(appointmentId: string, feeCents?: number): Promise<void>` — marca payment `refunded`, grava `cancelFeeCents=feeCents`, `refundedAt`. Chama `provider.refund` (mock no-op). Idempotente.

- [ ] **Step 1: Escrever o teste (falha)**

`apps/api/test/cancel-fee.spec.ts` (cria a base de fixtures + teste do refund):
```ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PaymentService } from '../src/payment/payment.service';

// Mocks mínimos das deps do PaymentService que o refund usa.
const prisma = new PrismaClient();

describe('PaymentService.refund com multa', () => {
  const ids: { tenant?: string; org?: string; loc?: string; shop?: string; svc?: string; appt?: string; user?: string } = {};

  beforeAll(async () => {
    ids.user = randomUUID();
    await prisma.appUser.create({ data: { id: ids.user, email: `u-${ids.user}@test.invalid` } });
    ids.tenant = (await prisma.tenant.create({ data: { slug: `cf-${ids.user.slice(0,8)}`, name: 'CF' } })).id;
    ids.org = (await prisma.organization.create({ data: { tenantId: ids.tenant, name: 'O' } })).id;
    ids.loc = (await prisma.location.create({ data: { tenantId: ids.tenant, organizationId: ids.org, name: 'L', addressLine1: 'R', city: 'C', state: 'SP', postalCode: '01000-000' } })).id;
    ids.shop = (await prisma.barbershop.create({ data: { tenantId: ids.tenant, locationId: ids.loc, name: 'S', lateCancelFeePct: 50 } })).id;
    ids.svc = (await prisma.service.create({ data: { tenantId: ids.tenant, barbershopId: ids.shop, name: 'Corte', durationMin: 30, basePriceCents: 3000 } })).id;
    ids.appt = (await prisma.appointment.create({ data: { tenantId: ids.tenant, barbershopId: ids.shop, serviceId: ids.svc, customerName: 'X', customerEmail: `u-${ids.user}@test.invalid`, startAt: new Date(Date.now() + 3600_000), endAt: new Date(Date.now() + 5400_000), priceCents: 3000, status: 'pending' } })).id;
    await prisma.payment.create({ data: { tenantId: ids.tenant, appointmentId: ids.appt, method: 'pix', status: 'paid', amountCents: 3000, paidAt: new Date() } });
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: ids.tenant } });
    await prisma.appUser.deleteMany({ where: { id: ids.user } });
    await prisma.$disconnect();
  });

  it('refund com feeCents grava cancelFeeCents e marca refunded', async () => {
    // Provider mock no-op.
    const provider = { name: 'mock', charge: jest.fn(), refund: jest.fn().mockResolvedValue(undefined) } as never;
    const service = new PaymentService(prisma as never, provider, { get: () => undefined } as never);
    await service.refund(ids.appt!, 1500);
    const p = await prisma.payment.findUnique({ where: { appointmentId: ids.appt! }, select: { status: true, cancelFeeCents: true, refundedAt: true } });
    expect(p?.status).toBe('refunded');
    expect(p?.cancelFeeCents).toBe(1500);
    expect(p?.refundedAt).not.toBeNull();
  });
});
```
> Nota: confirmar o construtor real de `PaymentService` (deps injetadas) ao ler o arquivo; ajustar os args do `new PaymentService(...)` pra casar (prisma, provider, configService/coupons conforme existir). Se o refund não usa alguma dep, passar stub.

- [ ] **Step 2: Rodar (falha)**

Run: `pnpm --filter @barbearia/api test cancel-fee`
Expected: FAIL — `cancelFeeCents` não é gravado (assinatura antiga ignora fee).

- [ ] **Step 3: Implementar — refund aceita feeCents**

Em `payment.service.ts`, mudar a assinatura e o update do `refund`:
```ts
  async refund(appointmentId: string, feeCents = 0): Promise<void> {
```
e no `prisma.payment.update` final:
```ts
      data: { status: 'refunded', refundedAt: new Date(), cancelFeeCents: feeCents },
```
(Manter o resto: guard `status !== 'paid'`, chamada `provider.refund`, logs.)

- [ ] **Step 4: Rodar (passa)**

Run: `pnpm --filter @barbearia/api test cancel-fee`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payment/payment.service.ts apps/api/test/cancel-fee.spec.ts
git commit -m "feat(api): refund registra cancelFeeCents (multa)"
```

---

## Task 4: Cancel sem bloqueio + multa + preview

**Files:**
- Modify: `apps/api/src/me/me-customer-appointments.controller.ts` (método `cancel` ~127 e `list` ~56)
- Test: `apps/api/test/cancel-fee.spec.ts` (adicionar testes do controller)

**Interfaces:**
- Consumes: `PaymentService.refund(appointmentId, feeCents)` (Task 3); `barbershop.lateCancelFeePct` (Task 1); `cancellation` no item (Task 2).
- Produces: `cancel` permite <24h, aplica multa, chama refund; `list` inclui `cancellation: { isLate, feeCents, refundCents }` por item.

- [ ] **Step 1: Escrever os testes (falham)**

Adicionar ao `cancel-fee.spec.ts` um describe que instancia o `MeCustomerAppointmentsController` (padrão do `me-customer.controller.spec.ts`: `new Controller(prisma, email, customers, coupons, payment...)` — confirmar deps lendo o arquivo) e:
```ts
it('cancela <24h aplicando multa de 50% e reembolso parcial', async () => {
  // appt startAt em +1h (dentro de 24h) já criado no beforeAll
  const user = { id: ids.user!, email: `u-${ids.user}@test.invalid`, raw: {} };
  await controller.cancel(user as never, ids.appt!);
  const appt = await prisma.appointment.findUnique({ where: { id: ids.appt! }, select: { status: true } });
  const pay = await prisma.payment.findUnique({ where: { appointmentId: ids.appt! }, select: { status: true, cancelFeeCents: true } });
  expect(appt?.status).toBe('cancelled');
  expect(pay?.status).toBe('refunded');
  expect(pay?.cancelFeeCents).toBe(1500); // 50% de 3000
});
```
> Não há mais expectativa de 403. Confirmar o construtor do controller e injetar `PaymentService` real (com provider mock) + stubs das outras deps.

- [ ] **Step 2: Rodar (falha)**

Run: `pnpm --filter @barbearia/api test cancel-fee`
Expected: FAIL — hoje lança 403 "24h".

- [ ] **Step 3: Implementar cancel**

No `cancel`, **remover** o bloco do deadline 403:
```ts
    // (REMOVER)
    // const cancellationDeadlineMs = appt.startAt.getTime() - 24 * 60 * 60 * 1000;
    // const canCancel = Date.now() <= cancellationDeadlineMs;
    // if (!canCancel) throw new ForbiddenException('Só é possível cancelar com 24h de antecedência.');
```
e substituir por cálculo da multa + refund (após o `update` de status cancelled):
```ts
    const isLate = Date.now() > appt.startAt.getTime() - 24 * 60 * 60 * 1000;
    const pct = await this.prisma.barbershop.findFirst({
      where: { tenantId: appt.tenantId },
      select: { lateCancelFeePct: true },
    });
    const feeCents = isLate
      ? Math.round((appt.service.basePriceCents * (pct?.lateCancelFeePct ?? 50)) / 100)
      : 0;
    await this.payment.refund(id, feeCents);
```
> `appt.service` já é carregado no `findUnique` do cancel (inclui `basePriceCents` — adicionar ao `select` do service se faltar). Injetar `PaymentService` no controller (adicionar ao constructor + ao módulo, confirmando o `MeModule`).

- [ ] **Step 4: Implementar preview no `list`**

No `list`, ao montar cada item, calcular o bloco `cancellation` (precisa do `lateCancelFeePct` da barbearia e do `amountCents` pago). Carregar o pct por tenant uma vez (batch, como os tenants) e o payment por appointment:
```ts
    // após carregar `validated` e os tenants, carregar pcts + pagamentos:
    const shops = await this.prisma.barbershop.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, lateCancelFeePct: true },
    });
    const pctByTenant = new Map(shops.map((s) => [s.tenantId, s.lateCancelFeePct]));
    const payments = await this.prisma.payment.findMany({
      where: { appointmentId: { in: validated.map((r) => r.id) } },
      select: { appointmentId: true, amountCents: true },
    });
    const paidByAppt = new Map(payments.map((p) => [p.appointmentId, p.amountCents]));
```
e no `.map`:
```ts
      const isLate = new Date(r.startAt).getTime() < Date.now() + 24 * 60 * 60 * 1000;
      const feeCents = isLate
        ? Math.round((r.priceCents * (pctByTenant.get(r.tenantId) ?? 50)) / 100)
        : 0;
      const paid = paidByAppt.get(r.id) ?? r.priceCents;
      // ... no objeto retornado:
      cancellation: { isLate, feeCents, refundCents: Math.max(0, paid - feeCents) },
```
> Adicionar `priceCents: true` ao `select` do `findMany` de appointments no `list` se não estiver.

- [ ] **Step 5: Rodar testes + typecheck**

Run: `pnpm --filter @barbearia/api test cancel-fee && pnpm --filter @barbearia/api typecheck`
Expected: PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/me/me-customer-appointments.controller.ts apps/api/src/me/me.module.ts apps/api/test/cancel-fee.spec.ts
git commit -m "feat(api): cancelar <24h com multa + preview de reembolso"
```

---

## Task 5: Persistir o pct (onboarding + admin)

**Files:**
- Modify: `apps/api/src/onboarding/onboarding.controller.ts`
- Modify: `apps/api/src/admin/admin-tenant-profile.controller.ts`
- Modify: `apps/web/src/app/onboarding/page.tsx`
- Modify: `apps/web/src/app/admin/perfil/page.tsx`

**Interfaces:**
- Consumes: schemas da Task 2.
- Produces: barbershop criada/editada com `lateCancelFeePct`.

- [ ] **Step 1: Onboarding controller — gravar o pct na criação da barbershop**

Ler `onboarding.controller.ts`; no `barbershop.create`, adicionar:
```ts
        lateCancelFeePct: body.barbershop.lateCancelFeePct,
```

- [ ] **Step 2: Admin tenant-profile — atualizar o pct**

Ler `admin-tenant-profile.controller.ts`; no update da barbershop, propagar `lateCancelFeePct` quando presente (padrão `...(body.lateCancelFeePct !== undefined && { lateCancelFeePct: body.lateCancelFeePct })`).

- [ ] **Step 3: Onboarding (web) — campo de %**

No accordion da barbearia (`onboarding/page.tsx`), adicionar um `FormField` `barbershop.lateCancelFeePct` (Input number, default 50, label "Multa de cancelamento tardio (%)"), seguindo o padrão dos outros campos. Incluir `lateCancelFeePct: 50` no `defaultValues`.

- [ ] **Step 4: Admin perfil (web) — editar o %**

Em `admin/perfil/page.tsx`, adicionar o campo `lateCancelFeePct` (number, 0–100) na config da barbearia, salvando via o endpoint de tenant-profile.

- [ ] **Step 5: Typecheck + lint (api + web)**

Run: `pnpm --filter @barbearia/api typecheck && pnpm --filter @barbearia/web typecheck && pnpm --filter @barbearia/web lint`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/onboarding apps/api/src/admin apps/web/src/app/onboarding apps/web/src/app/admin/perfil
git commit -m "feat: configurar multa de cancelamento (onboarding + admin)"
```

---

## Task 6: Copy do CancelModal (mobile)

**Files:**
- Modify: `apps/mobile-customer/app/(app)/meus-agendamentos.tsx` (`CancelModal` + onde passa o item)

**Interfaces:**
- Consumes: `item.cancellation: { isLate, feeCents, refundCents }` (Task 2/4).

- [ ] **Step 1: Mostrar multa/reembolso no modal**

No `CancelModal`, quando `item.cancellation.isLate && item.cancellation.feeCents > 0`, exibir um aviso antes dos botões:
```tsx
{item && item.cancellation.isLate && item.cancellation.feeCents > 0 ? (
  <Text className="mt-3 text-sm text-foreground">
    Cancelar com menos de 24h tem multa de{' '}
    {(item.cancellation.feeCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
    {'\n'}Você recebe{' '}
    {(item.cancellation.refundCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}de volta.
  </Text>
) : null}
```
(Usa o helper `formatPriceBRL` de `@/lib/format` se preferir — já importado em outras telas.)

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @barbearia/mobile-customer typecheck && pnpm --filter @barbearia/mobile-customer lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile-customer/app/(app)/meus-agendamentos.tsx"
git commit -m "feat(mobile-customer): CancelModal mostra multa e reembolso"
```

---

## Verificação final (QA)

- [ ] `pnpm --filter @barbearia/api test` → verde (inclui cancel-fee).
- [ ] typecheck + lint verdes em api, web, mobile-customer.
- [ ] Smoke manual: cancelar <24h no app → modal mostra multa/reembolso → confirma → some da lista (status cancelled, payment refunded com cancelFeeCents).
- [ ] Cancelar ≥24h → sem multa, reembolso integral.

## Fora de escopo (go-live de pagamento)

- Estorno real no Mercado Pago (dinheiro). `provider.refund` segue no-op no mock.
