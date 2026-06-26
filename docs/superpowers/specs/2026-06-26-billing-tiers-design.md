# Billing — Planos por Tier (Free/Basic/Pro) — Design

- **Data:** 2026-06-26
- **Status:** Aprovado (design) — pronto pra plano
- **Escopo:** Evoluir o billing de **1 produto (Mensal/Anual)** para **3 tiers (Free/Basic/Pro)**, alinhando com a landing. **Soft tiers**: billing/cobrança corretos por tier agora; **enforcement dos limites é follow-up**.
- **Base:** evolui `docs/superpowers/specs/2026-06-24-billing-assinatura-design.md` (já implementado e em `main` local).

## 1. Contexto

A landing (`apps/web/src/components/landing/pricing.tsx`) anuncia 3 tiers, mas o billing construído é 1 produto único (R$99,90 Mensal/Anual). Esta spec reconcilia: o modelo passa a ser por tier. O backend de assinatura (Subscription, preapproval MP, webhook, gate de booking, endpoints admin) já existe e é **reaproveitado** — muda o catálogo, o onboarding (cartão condicional) e a seleção de plano.

## 2. Decisões (do brainstorm)

1. **3 tiers** com os preços/features da landing.
2. **Free**: R$0, **sem cartão**, sem trial, acesso imediato e permanente. Nunca cobrado nem suspenso.
3. **Basic/Pro**: cartão no onboarding + **trial 14 dias** + preapproval (como já é hoje).
4. **Ciclo**: Mensal e Anual pros pagos; **anual = mensal −20%**, cobrado uma vez/ano (frequência 12 meses no preapproval).
5. **Soft tiers**: enforcement de limites (nº de barbeiros, lembretes, cupons, relatórios, avaliações) é **follow-up**, não entra agora.
6. Seleção de plano na landing leva pro onboarding com tier+ciclo **pré-selecionados**.

## 3. Catálogo (constantes em `@barbearia/schemas/billing.ts`)

Substitui `BILLING_PLAN`/`planForCycle`:

```ts
export const TRIAL_DAYS = 14; // só tiers pagos
export const BILLING_TIERS = {
  free:  { tier: 'free',  monthly: 0,    annual: 0,     requiresCard: false },
  basic: { tier: 'basic', monthly: 4900, annual: 46800, requiresCard: true },
  pro:   { tier: 'pro',   monthly: 9900, annual: 94800, requiresCard: true },
} as const;
export type PlanTier = keyof typeof BILLING_TIERS; // 'free' | 'basic' | 'pro'

// priceCents pro (tier, ciclo). Free = 0 em qualquer ciclo.
export function priceForTier(tier: PlanTier, cycle: BillingCycle): number;
// dados pro charge do preapproval (mensal: freq 1 mês; anual: freq 12 meses).
export function planForTier(
  tier: PlanTier,
  cycle: BillingCycle,
): { priceCents: number; mpFrequency: number; mpFrequencyType: 'months'; requiresCard: boolean };
```
- Valores (da landing): Basic mensal R$49 (`4900`) / anual R$468 (`46800`, =R$39/mês); Pro mensal R$99 (`9900`) / anual R$948 (`94800`, =R$79/mês).
- `BillingCycle` (`monthly`|`annual`) e os helpers de gating (`subscriptionAllowsPublicBooking` etc.) **permanecem**.

## 4. Modelo de dados (delta da `Subscription`)

- **+ coluna `tier`** (`String`, NOT NULL) — `free`|`basic`|`pro`.
- **`trial_ends_at` vira nullable** (Free não tem trial).
- `free`: `status='active'`, `mp_preapproval_id=null`, `trial_ends_at=null`, `price_cents=0`, `billing_cycle='monthly'`.
- `basic`/`pro`: inalterado (`trialing` + trial + preapproval + priceCents do tier).
- Migration nova: `ALTER TABLE subscriptions ADD COLUMN tier TEXT NOT NULL` (sem default; definido no insert) + `ALTER COLUMN trial_ends_at DROP NOT NULL`. (Prod ainda não tem dados; aplicar junto com a migration base.)

## 5. Schema do onboarding (`@barbearia/schemas/onboarding.ts`)

- **+ `tier: z.enum(['free','basic','pro'])`**.
- **`cardTokenId` condicional** via `superRefine`: obrigatório (`min 1`) se `tier !== 'free'`; opcional/ausente se `free`.
- `billingCycle` continua.

## 6. Onboarding (web + controller)

**Web (`apps/web/src/app/onboarding/page.tsx`):**
- Seletor de **tier** (Free/Basic/Pro) + toggle **Mensal/Anual**.
- Lê `searchParams` `plan` e `cycle` → pré-seleciona (default `pro`/`monthly` se ausente). Mapeia `mensal→monthly`, `anual→annual`.
- **Campos de cartão (`MpCardFields`) só aparecem se `BILLING_TIERS[tier].requiresCard`** (Basic/Pro). No Free, somem; o submit não tokeniza.
- `defaultValues`: `tier` (do query param), `billingCycle`, `cardTokenId` placeholder só pros pagos.
- `onSubmit`: se tier pago → tokeniza (como hoje) e injeta `cardTokenId`; se free → não tokeniza, `cardTokenId` omitido.

**Controller (`onboarding.controller.ts`):**
- Resolve `planForTier(body.tier, body.billingCycle)`.
- **Free**: cria `Subscription` `tier='free'`, `status='active'`, sem preapproval, `trialEndsAt=null`, `priceCents=0` (na mesma tx). Nada de MP.
- **Basic/Pro**: como hoje — preapproval (preço do tier) **antes** da tx + `Subscription` `tier`, `trialing`, trial 14d, `mpPreapprovalId`, `priceCents`. Compensação `cancelPreapproval` no catch.

## 7. Landing → form

- `pricing.tsx`: cada CTA vira `href="/onboarding?plan=${tier}&cycle=${cycleAtual}"` (lê o toggle Mensal/Anual já existente do componente). `free→plan=free`.
- Onboarding usa esses params pra pré-seleção (§6).

## 8. Tela `/admin/assinatura`

- Mostra o **nome do tier** (Free/Basic/Pro) + ciclo + preço.
- **Free**: rótulo "Plano grátis", **sem** botões de atualizar-cartão/cancelar (nada a cobrar).
- **Basic/Pro**: mantém atualizar-cartão + cancelar como está.
- Banner de inadimplência (já existe) só dispara pros pagos (Free nunca fica past_due/suspended).

## 9. Erros em português

- Mensagens de erro do fluxo de cartão já ajustadas pra PT amigável (técnico só no console). Manter esse padrão nas mudanças.

## 10. Testes

- `billing.spec.ts`: `priceForTier`/`planForTier` pros 3 tiers × 2 ciclos + `requiresCard`.
- `onboarding.spec.ts`: schema aceita `free` sem `cardTokenId`; exige `cardTokenId` em basic/pro.
- `billing-onboarding.spec.ts`: free cria Subscription `active` sem preapproval (MP não chamado); basic/pro cria `trialing` com preapproval (como hoje).
- Build de produção do web (valida onboarding/landing).

## 11. Fora de escopo (follow-up)

- **Enforcement** dos limites por tier (nº de barbeiros, lembretes, cupons, relatórios, avaliações).
- **Troca de tier** (upgrade/downgrade) depois do cadastro.
- Proração ao trocar de plano.

## 12. Riscos

- `free` muda o invariante "onboarding sempre cria preapproval" — testes cobrem o branch free (MP não chamado).
- Migration altera `trial_ends_at` pra nullable — sem dados em prod, baixo risco.
- Cartão condicional: o `superRefine` precisa garantir que free realmente dispensa o token (teste cobre).
