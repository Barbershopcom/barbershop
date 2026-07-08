# Multi-unidade + Limites por Plano — Design

- **Data:** 2026-07-07
- **Status:** Aprovado (design) — pronto pra plano
- **Escopo:** Plano/assinatura é **por dono (Tenant)**, não por unidade. Tenant passa a ter **N unidades (Barbershops)** dentro dele; o tier define **teto de unidades** e **teto de funcionários por unidade**. É o "enforcement follow-up" prometido na spec `2026-06-26-billing-tiers-design.md`, mais o multi-unidade real.
- **Base:** evolui `2026-06-26-billing-tiers-design.md` (tiers implementados, em `main` local).

## 1. Contexto / problema

Hoje o onboarding cria **um tenant novo por barbearia** (`onboarding.controller.ts`): dono com 2 unidades = 2 tenants = 2 assinaturas = paga 2×. E os tiers não têm limite nenhum — Free/Basic/Pro só diferem no preço. Além disso, toda a API admin assume 1 barbershop por tenant (`barbershop.findFirst()` sem filtro em employees, hours, services, profile), e a API pública filtra por `tenantId` apenas.

O schema, porém, **já carrega `barbershopId`** em Service, Employee, Appointment, slots e booking — o single-unit vive só nas queries e no fluxo de criação.

## 2. Decisões (do brainstorm)

1. **Assinatura continua 1:1 com Tenant** (dono = conta de cobrança). Nada muda no MP/preapproval.
2. **Limites por tier** (preço fixo com teto; sem preço por unidade adicional):
   - Free: **1 unidade**, **2 funcionários/unidade**
   - Basic: **2 unidades**, **5 funcionários/unidade**
   - Pro: **5 unidades**, **15 funcionários/unidade**
3. **Slug por unidade**: cada Barbershop ganha slug público próprio. O slug do tenant continua funcionando: 1 unidade → vai direto; >1 → seletor de unidade.
4. **Downgrade bloqueado** se o uso atual (unidades ativas ou funcionários ativos em alguma unidade) excede o teto do plano de destino — erro claro pedindo pra desativar o excedente antes.
5. **Fora de escopo:** preço por unidade adicional; migração de donos que já criaram 2 tenants separados (pré-go-live, sem usuários reais); multi-org; limites de outras features (cupons, lembretes — continuam soft).

## 3. Catálogo (`@barbearia/schemas/billing.ts`)

```ts
export const PLAN_LIMITS = {
  free:  { maxUnits: 1, maxEmployeesPerUnit: 2 },
  basic: { maxUnits: 2, maxEmployeesPerUnit: 5 },
  pro:   { maxUnits: 5, maxEmployeesPerUnit: 15 },
} as const satisfies Record<PlanTier, { maxUnits: number; maxEmployeesPerUnit: number }>;

export function limitsForTier(tier: PlanTier): { maxUnits: number; maxEmployeesPerUnit: number };
/** true se o uso cabe no tier alvo (validação de downgrade). */
export function usageFitsTier(
  tier: PlanTier,
  usage: { units: number; maxEmployeesInAnyUnit: number },
): boolean;
```

## 4. Modelo de dados (delta)

- **`Barbershop.slug String @unique`** — novo, lowercase, mesmo formato do slug de tenant. Migration com backfill: unidade existente herda `tenants.slug` (1:1 hoje, sem colisão). NOT NULL após backfill.
- **`Barbershop.isActive Boolean @default(true)`** — novo (hoje não existe). Unidade desativada não conta no limite, não aparece no público e não recebe agendamento.
- Sem mudança em Tenant/Subscription.

## 5. Enforcement (API)

Novo `PlanLimitsService` (módulo billing):

- `assertCanAddUnit(tx, tenantId)` — conta barbershops ativas do tenant vs `maxUnits` do tier da Subscription.
- `assertCanAddEmployee(tx, tenantId, barbershopId)` — conta employees ativos **da unidade** vs `maxEmployeesPerUnit`.
- Estouro → **409** com body `{ code: 'PLAN_LIMIT_REACHED', resource: 'unit'|'employee', limit, current, tier }` — a UI usa pra mostrar CTA de upgrade.
- Sem Subscription (não deveria acontecer) → trata como `free`.
- Reativar (unidade ou funcionário) também passa pela checagem — senão vira brecha (desativa/reativa pra furar o teto).

Pontos de trava:
1. **Criar/reativar funcionário** — `admin-employees.controller.ts`.
2. **Criar/reativar unidade** — endpoint novo (§6).
3. **Troca de plano** (endpoint de upgrade/downgrade em `admin-billing.controller.ts`): downgrade valida `usageFitsTier`; se não cabe → 409 `PLAN_LIMIT_REACHED` listando o que excede.

## 6. Unidades no admin (API + web)

**API — novo `units` module (admin, roles admin):**
- `GET /admin/units` — lista barbershops do tenant com `{ id, slug, name, isActive, employeeCount }` + `{ limit: maxUnits, tier }`.
- `POST /admin/units` — cria **Location + Barbershop** no tenant atual (payload: nome, slug, endereço, `lateCancelFeePct` default). Passa por `assertCanAddUnit`. Não cria tenant nem assinatura.
- `PATCH /admin/units/:id` — editar nome/slug/endereço, ativar/desativar (reativação passa pela trava).

**Web admin:**
- Página nova **`/admin/unidades`** — lista com contador "X de Y unidades do seu plano", criar/editar/desativar, link público de cada unidade, CTA de upgrade quando no teto.
- **Seletor de unidade** no shell (`_shell.tsx`): dropdown no topo com a unidade ativa, persistida (localStorage + query/context). Com 1 unidade, não renderiza.
- Páginas **team, services, hours, agenda** passam `barbershopId` da unidade ativa; API admin correspondente troca `findFirst()` por filtro `barbershopId` (validando que pertence ao tenant — RLS já garante, mas o filtro explícito evita vazamento entre unidades do mesmo tenant).
- Perfil do tenant (`/admin/perfil`) continua tenant-scoped (nome da marca, MP, instagram).

## 7. Público por unidade

- **Resolução de slug** (`SlotsRepository.resolveTenant` → vira `resolvePublicTarget(slug)`): tenta `barbershops.slug` primeiro; se achar → `{ tenant, barbershop }`. Senão tenta `tenants.slug` → se o tenant tem **1** unidade ativa, resolve pra ela; se tem **várias**, retorna `{ tenant, barbershops: [...] }` (modo seletor).
- **GET /public/tenants/:slug** ganha `units: [{ slug, name, addressLine }]` quando seletor; página web `/b/[slug]` mostra escolha de unidade e navega pro slug da unidade.
- **services / employees / promotions / reviews / slots / booking públicos** filtram por `barbershopId` resolvido (não mais só `tenantId`). Booking já grava `barbershopId` via service — inalterado.
- **Discover** (`/descobrir`, mobile-customer): lista **unidades** (barbershop + endereço da Location), não tenants; cada card leva pro slug da unidade.
- **mobile-customer**: telas de agendamento já consomem os endpoints públicos por slug — passa a usar slug de unidade; ajuste pontual no discover/deep-links.
- Compat: links antigos (slug do tenant) continuam funcionando via fallback.

## 8. Onboarding e landing

- Onboarding **inalterado** no fluxo (cria tenant + 1ª unidade); a Barbershop criada ganha `slug` = slug do tenant.
- Landing/pricing (`pricing.tsx`) e página `/admin/assinatura` mostram os limites por tier (1/2/5 unidades, 2/5/15 barbeiros por unidade).

## 9. Erros e mensagens

- `409 PLAN_LIMIT_REACHED` sempre com `{ resource, limit, current, tier }`.
- Web: toast/dialog com "Seu plano {tier} permite {limit} {unidades|barbeiros por unidade}. Faça upgrade para adicionar mais." + link `/admin/assinatura`.

## 10. Testes

- Unit (schemas): `limitsForTier`, `usageFitsTier`.
- API (spec): criar unidade no teto → 409; criar funcionário no teto → 409; reativar no teto → 409; downgrade com uso excedente → 409; downgrade com uso ok → 200; resolução de slug (unidade, tenant 1-unidade, tenant multi → seletor, slug inexistente → 404).
- Regressão: fluxo de booking público com slug antigo de tenant continua passando.

## 11. Fases de execução

1. **Limites** — `PLAN_LIMITS` + `PlanLimitsService` + trava de funcionários + regra de downgrade. Sem mudança de comportamento pra quem está dentro do teto.
2. **Multi-unidade admin** — migration slug/isActive, units module, página Unidades, seletor de unidade, scoping dos controllers admin.
3. **Público por unidade** — resolução dual de slug, seletor público, discover/mobile por unidade, landing com limites.
