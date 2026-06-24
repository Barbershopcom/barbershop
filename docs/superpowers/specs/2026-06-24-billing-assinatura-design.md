# Billing / Assinatura SaaS (trial com cartão) — Design

- **Data:** 2026-06-24
- **Status:** Aprovado (design) — pronto pra plano
- **Escopo:** Cobrança recorrente da plataforma sobre o dono da barbearia (SaaS), com cartão coletado no onboarding, trial de 14 dias e cobrança automática via **Mercado Pago Assinaturas (preapproval)**. Separado do split do marketplace (cliente → barbearia).

## 1. Contexto

- Billing é **greenfield**: não há modelo de plano/assinatura no Prisma; `tenant.trialEndsAt` é gravado no onboarding mas **não há nenhum enforcement** de expiração hoje.
- O Mercado Pago já está integrado pro **marketplace/split** (cobrança do cliente na conta do vendedor com `application_fee`). A **assinatura** é outra relação: a **plataforma** cobra o **dono** na **conta MP da plataforma** (`MERCADOPAGO_ACCESS_TOKEN`).
- A landing diz "Sem cartão pra começar" — vai mudar (cartão passa a ser exigido).

## 2. Decisões (do brainstorming)

1. **Cartão no onboarding** + trial de 14 dias + cobrança automática no fim do trial.
2. **Processador:** Mercado Pago Assinaturas (preapproval). Tokenização do cartão via SDK do MP (PCI-safe).
3. **Planos:** 1 produto, 2 ciclos — **Mensal R$99,90** / **Anual R$999** (paga 10, leva 12 ≈ 17% off). Seletor de ciclo no onboarding.
4. **Inadimplência:** período de graça + retries (dunning, dirigido pelo MP), depois **suspende**.
5. **Unidade de cobrança:** **por barbearia (tenant)** — cada barbearia tem sua assinatura e seu trial.
6. **Abordagem:** o MP cuida de trial/recorrência/retries; a gente reage por webhook e faz gating (Abordagem A).

## 3. Catálogo de planos (constantes, sem tabela)

Em `@barbearia/schemas` (`billing.ts`):

```ts
export const TRIAL_DAYS = 14;
export const BILLING_PLAN = {
  monthly: { cycle: 'monthly', priceCents: 9990,  mpFrequency: 1,  mpFrequencyType: 'months' },
  annual:  { cycle: 'annual',  priceCents: 99900, mpFrequency: 12, mpFrequencyType: 'months' },
} as const;
export type BillingCycle = keyof typeof BILLING_PLAN; // 'monthly' | 'annual'
```

YAGNI: só 1 produto × 2 ciclos com preços fixos → constantes, não tabela `Plan`.

## 4. Modelo de dados

Nova tabela `Subscription` (1 por barbearia):

| campo | tipo | descrição |
|---|---|---|
| `id` | uuid | PK |
| `tenantId` | uuid **unique** | FK → Tenant; 1 assinatura por barbearia |
| `billingCycle` | string | `monthly` \| `annual` |
| `status` | string | `trialing` \| `active` \| `past_due` \| `suspended` \| `cancelled` |
| `priceCents` | int | snapshot do preço no cadastro (auditoria) |
| `mpPreapprovalId` | string? | id do preapproval no MP (fonte pra resolver webhook) |
| `trialEndsAt` | timestamptz | fim do trial (now + 14d) |
| `currentPeriodEnd` | timestamptz? | fim do ciclo pago atual |
| `lastPaymentStatus` | string? | último resultado de cobrança |
| `lastChargedAt` | timestamptz? | última cobrança aprovada |
| `createdAt` / `updatedAt` | timestamptz | |

- `tenant.trialEndsAt` vira **legado**; a verdade do trial passa a ser `Subscription.trialEndsAt`. Mantém-se em sync no onboarding pra não quebrar nada; marcar pra deprecar.
- **RLS:** `Subscription` é tenant-scoped (mesma política das demais tabelas). Leitura via membership admin. Index em `mpPreapprovalId` pra lookup do webhook.

## 5. Onboarding + tokenização

**Frontend (`apps/web` onboarding):**
- **Seletor de ciclo** (Mensal R$99,90 / Anual R$999) — toggle com os dois preços.
- **Card Brick / Secure Fields do MP**: inputs de número/validade/CVV num **iframe do MP**, tokeniza no cliente → `cardTokenId`. O PAN **nunca** passa pelo nosso backend.
- Submit inclui `billingCycle` + `cardTokenId`.
- Carrega o SDK do MP com `NEXT_PUBLIC_MP_PUBLIC_KEY`.

**Schema:** `createTenantOnboardingSchema` ganha `billingCycle: 'monthly' | 'annual'` e `cardTokenId: z.string().min(1)`.

**Backend (`onboarding.controller`) — ordem pra nunca criar barbearia sem assinatura:**
1. Pré-gera `tenantId` (já existe hoje).
2. **Cria o preapproval no MP** (conta plataforma), fora da transação do banco:
   - `payer_email` = email do dono, `card_token_id`, `external_reference` = `tenantId`,
   - `auto_recurring`: `{ transaction_amount, currency_id: 'BRL', frequency, frequency_type }` conforme o ciclo,
   - `free_trial: { frequency: 14, frequency_type: 'days' }` (MP cobra só no fim do trial),
   - `status: 'authorized'`, `back_url`.
3. **Transação no banco**: cria tenant + user + membership + `Subscription` (`status='trialing'`, `mpPreapprovalId`, `priceCents`, `trialEndsAt=now+14d`).
4. **Compensação:** se a transação falhar após o preapproval, **cancela o preapproval** (best-effort). Se o MP recusar o cartão no passo 2, o onboarding falha com erro claro ("cartão recusado, revise os dados") e **nenhuma barbearia é criada**.

A chamada externa fica **fora** da transação (sem segurar tx aberta).

## 6. Webhooks + máquina de estados

**Recebimento:** reusa `/webhooks/mercadopago`, tratando os tópicos de assinatura:
- `subscription_preapproval` (status do preapproval: authorized/paused/cancelled),
- `subscription_authorized_payment` (resultado de cada cobrança recorrente).

Reusa o que já está endurecido: **verificação `x-signature` (HMAC)** + **dedup idempotente** (chave estável, mesmo padrão do M1). Resolve a barbearia pelo **`mpPreapprovalId` local** (nunca confiar só no `external_reference` — lição do C2).

**Transições:**

| Evento | Transição |
|---|---|
| Onboarding cria preapproval | → `trialing` |
| Cobrança recorrente **aprovada** | → `active` (+ `currentPeriodEnd`, `lastChargedAt`, `lastPaymentStatus`) |
| Cobrança recorrente **recusada** | → `past_due` (graça começa; MP re-tenta) |
| Preapproval **cancelado por falta de pagamento** | → `suspended` |
| Dono cancela | → `cancelled` |
| Cartão atualizado e cobrança volta | `past_due` → `active` |

- **Dunning:** dirigido pelo MP (retries). Em `past_due`, admin segue com **banner**. MP desistindo → `suspended`.
- **Rede de segurança (opcional):** job pg-boss diário que força `suspended` se `past_due` exceder **7 dias** sem resolução por webhook (evita ficar preso se um webhook se perder). Constante `BILLING_GRACE_DAYS = 7`.

## 7. Gating de suspensão

`SubscriptionGuard` carrega o status da `Subscription` do tenant e aplica:

| Status | Admin (escrita) | `/b/slug` (novo agendamento) | Leitura/login | Tela de assinatura |
|---|---|---|---|---|
| `trialing` / `active` | ✅ | ✅ | ✅ | ✅ |
| `past_due` | ✅ (banner) | ✅ | ✅ | ✅ |
| `suspended` / `cancelled` | ❌ | ❌ bloqueia novos agendamentos | ✅ | ✅ (reativar) |

- Suspensão bloqueia o que dá **leverage** (novos agendamentos no link público + escrita no admin) e **preserva os dados**. Nada é apagado; agendamentos já existentes não somem.
- **Reativar:** atualizar cartão em `/admin/assinatura` → MP retoma → webhook → `active`.

## 8. UI + endpoints + landing

- **`/admin/assinatura`** (nova): plano/ciclo, status, próximo débito + valor, **atualizar cartão** (Brick do MP), **cancelar**. Banner global no admin quando `past_due`/`suspended`.
- **Endpoints (admin, tenant-scoped, `assertTenantAdmin` + `X-Tenant-Id`):**
  - `GET /admin/subscription` — status/ciclo/próximo débito (sem expor dado de cartão).
  - `POST /admin/subscription/update-card` — recebe novo `cardTokenId`, atualiza o cartão no preapproval do MP.
  - `POST /admin/subscription/cancel` — cancela o preapproval no MP → `cancelled`.
- **Landing:** "Sem cartão pra começar" → **"14 dias grátis · cancele quando quiser"**; ajustar o subtítulo do onboarding.
- **Env nova:** `NEXT_PUBLIC_MP_PUBLIC_KEY` (public key do MP pro SDK no cliente). A `MERCADOPAGO_ACCESS_TOKEN` (plataforma) já existe e é usada pro preapproval.

## 9. Testes

- **Unit:** máquina de estados (todas as transições), decisões do `SubscriptionGuard` por status, cálculo de preço/ciclo, transação de onboarding + cancelamento compensatório do preapproval.
- **Webhook:** aprovado/recusado/cancelado → status correto; assinatura inválida rejeitada; dedup de replay.
- **E2E manual:** cartões de teste do sandbox do MP (aprovado / recusado) cobrindo trial → 1ª cobrança → past_due → suspended → reativação.

## 10. Fora de escopo

- Feature-gating por tier (só Mensal vs Anual nesta versão; sem limites por nº de barbeiros/unidades).
- Plano gratuito permanente.
- Boleto/PIX como meio da assinatura (só cartão nesta versão).
- Cupons/descontos na assinatura.
- Faturas/NF-e.

## 11. Riscos

- **`free_trial` do preapproval:** confirmar o suporte/limites exatos do MP (frequência, cobrança após trial) no início da implementação; se divergir, cair pra agendamento próprio (pg-boss) da 1ª cobrança.
- **Dinheiro recorrente real:** erro custa dinheiro/churn — daí o gating conservador e os testes de webhook.
- **Webhook perdido:** mitigado pela rede de segurança pg-boss (§6).
- **Onboarding mais longo (cartão):** queda de conversão; aceito como decisão de produto (trial com cartão).
