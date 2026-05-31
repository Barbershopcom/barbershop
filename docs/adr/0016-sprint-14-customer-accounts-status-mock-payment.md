# ADR-016: Sprint 14 — Customer accounts + status workflow + pagamento mock

- **Data:** 2026-05-31
- **Status:** Aprovado
- **Supersedes:** nada (implementa roadmap do ADR-015)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

ADR-015 definiu o roadmap. S14 é a fundação do produto-da-visão:
contas de cliente, máquina de estados de agendamento com confirmação
do barbeiro, e pagamento **mock mas payment-ready** (arquitetura
pronta pra trocar por PSP real no S21 sem refazer schema).

Decisão explícita do usuário: *"pagamento é o último mas é o que
gerencia tudo. Mock agora, cenário preparado pra implementação real
depois."*

---

## Decisões

### 1. Customer = perfil de cliente de um AppUser (espelha Employee)

```prisma
model Customer {
  id          String  @id @default(uuid()) @db.Uuid
  appUserId   String  @unique @map("app_user_id") @db.Uuid
  displayName String  @map("display_name")
  phoneE164   String? @map("phone_e164")
  ...
}
```

`AppUser` (identidade Supabase) já é compartilhado por admin/barbeiro
(via `Employee`). `Customer` é o perfil-cliente do mesmo AppUser.
Não-tenant-scoped (cliente reserva em N barbearias).

### 2. Appointment ganha `customerId` nullable — guest continua válido

Booking público (guest) continua funcionando sem `customerId`. Quando
cliente logado reserva, `customerId` é preenchido. Histórico do cliente
logado = `WHERE customerId = me` (substitui o match-por-email atual).

### 3. Máquina de estados (status em inglês no DB, PT na UI)

| status (DB) | Significado | Vision (PT) |
|---|---|---|
| `awaiting_payment` | criado, pagamento não concluído | — |
| `pending` | pago, aguardando barbeiro confirmar | pendente |
| `confirmed` | barbeiro confirmou | confirmado |
| `completed` | corte concluído | concluído |
| `cancelled` | cancelado | cancelado |
| `expired` | barbeiro não confirmou + hora passou | expirado |
| `no_show` | cliente faltou | faltou |

Migração de dados existentes:
- `booked` → `confirmed` (no mundo antigo, booking = ativo direto)
- `completed`/`cancelled`/`no_show` → iguais

Transições válidas:
```
awaiting_payment → pending (pagamento confirmado)
awaiting_payment → cancelled (timeout pagamento / desistência)
pending → confirmed (barbeiro confirma)        [S15]
pending → cancelled (barbeiro recusa / cliente cancela)
confirmed → completed (barbeiro conclui)        [S15]
confirmed → cancelled (cancelamento com regra de taxa)
pending → expired (job: hora passou sem confirmar)  [S15]
confirmed → no_show (cliente faltou)            [S15]
```

S14 implementa awaiting_payment→pending e cancelamentos. As transições
[S15] ficam pro próximo sprint.

### 4. EXCLUDE constraint cobre status "ativos"

Anti-overbooking hoje dispara `WHERE status = 'booked'`. Novo conjunto
ativo que ocupa slot: `awaiting_payment`, `pending`, `confirmed`.
Atualiza a constraint.

### 5. Payment — entidade payment-ready desde o mock

```prisma
model Payment {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  appointmentId     String   @unique @map("appointment_id") @db.Uuid
  provider          String   // 'mock' | 'mercadopago' | 'asaas'
  method            String   // 'pix' | 'credit' | 'debit' | 'wallet'
  status            String   // 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'
  amountCents       Int      @map("amount_cents")        // total cobrado
  feeCents          Int      @map("fee_cents")           // taxa do método (cliente paga)
  platformFeeCents  Int      @map("platform_fee_cents")  // comissão plataforma (split futuro)
  providerPaymentId String?  @map("provider_payment_id") // id no PSP
  providerPayload   Json?    @map("provider_payload")    // resposta/webhook
  paidAt            DateTime? @map("paid_at")
  ...
}
```

Webhook-ready: `providerPaymentId` + `providerPayload` + transições de
`status`. Mock seta `paid` na hora. PSP real depois faz pending→paid
via webhook, mesma estrutura.

### 6. PaymentProvider interface + MockPaymentProvider

```ts
interface PaymentProvider {
  createCharge(input): Promise<{ providerPaymentId, status, ... }>;
  // futuro: handleWebhook, refund
}
```

`MockPaymentProvider` aprova na hora (ou simula falha por flag de teste).
`MercadoPagoProvider`/`AsaasProvider` no S21 implementam a mesma
interface — DI troca a impl sem tocar o resto.

### 7. Taxas por método (cliente paga) — config simples

Taxas mockadas como constantes agora (Pix ~0%, débito ~2%, crédito ~5%).
No S21 vêm do PSP. `platformFeeCents` calculado mas não cobrado de
verdade no mock.

### 8. Compat: booking guest público continua sem login

`POST /public/tenants/:slug/appointments` segue criando guest. A
diferença: agora cria com status `awaiting_payment` → mock auto-paga →
`pending`. Para o booking logado, o mesmo fluxo + `customerId`.

---

## Fases

| Fase | Entrega |
|---|---|
| 1 | Schema: Customer + Payment + Appointment (customerId, priceCents) + status migration + EXCLUDE atualizado |
| 2 | Booking cria `awaiting_payment` + Payment record; status machine no service |
| 3 | PaymentProvider interface + MockProvider + endpoint "confirmar pagamento" (mock) → pending |
| 4 | Customer accounts: vincular booking logado a customerId; /me/customer-appointments usa customerId |
| 5 | UI: checkout mock (mobile + web) + StatusBadge novos status |

Commit ao fim de cada fase. Sem push automático.

---

## Trade-offs

- Status em inglês no DB (consistência com código atual) + tradução na
  UI. Migração converte `booked`→`confirmed`.
- Mock auto-aprova: fluxo ponta-a-ponta sem PSP, mas não testa falha de
  pagamento real (cobre com flag de simulação de falha).
- `Payment` modelado completo desde já = leve over-engineering pro mock,
  mas é exatamente o ponto: trocar pro PSP real vira implementar a
  interface, não migrar schema.
