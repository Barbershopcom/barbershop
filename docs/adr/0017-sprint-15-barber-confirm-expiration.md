# ADR-017: Sprint 15 — Barbeiro confirma/recusa + expiração

- **Data:** 2026-05-31
- **Status:** Aprovado
- **Supersedes:** nada (implementa roadmap do ADR-015, continua ADR-016)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

ADR-016 (Sprint 14) entregou a máquina de estados de agendamento com o
status `pending` (pago, aguardando barbeiro) e `confirmed`, mas **nada
ainda transiciona entre eles**: não há endpoint pro barbeiro confirmar/
recusar, nem expiração automática. Hoje um booking pago fica `pending`
pra sempre.

Sprint 15 fecha esse loop: barbeiro confirma/recusa, job expira os
pendentes vencidos, e cada transição notifica quem importa (push +
email vintage).

Brainstorming (superpowers:brainstorming) registrado aqui como design doc.

---

## Decisões

### 1. Deadline de confirmação = `min(booking + 1h, startAt)`

Pendente expira no que vier primeiro: 1h após a reserva, OU o horário do
corte. Pressiona o barbeiro a confirmar rápido e libera o slot cedo pra
outro cliente, sem deixar "pending" um corte cujo horário já passou.

Campo novo `Appointment.confirmDeadline` (timestamptz, nullable —
preenchido quando vira `pending`).

### 2. Expiração via pg-boss agendado por appointment (Abordagem A)

Quando o pagamento confirma (`awaiting_payment → pending`),
`scheduleExpiration` agenda um job pg-boss com `startAfter:
confirmDeadline`. Espelha exatamente o `scheduleReminder` (Sprint 6):
- Job idempotente: ao rodar, relê o appointment e só expira se ainda
  está `pending`. Se já foi confirmado/cancelado, no-op.
- Sem polling, sem coluna materializada extra além do deadline, dispara
  no instante certo (essencial pro refund + notificação de expiração
  saírem na hora).

Rejeitadas: cron varre-pendentes (latência de minutos, query custosa) e
lazy/expira-na-leitura (estado mentiroso no banco, não dispara refund
nem notificação sozinho).

### 3. Transições e quem pode fazer

| De | Para | Ator | Efeito colateral |
|---|---|---|---|
| `pending` | `confirmed` | barbeiro dono do appt | notifica cliente |
| `pending` | `cancelled` (recusa) | barbeiro dono | refund + notifica cliente |
| `pending` | `expired` | sistema (job) | refund + notifica cliente |
| `confirmed` | `completed` | barbeiro dono | (Sprint 16) |

Guarda de autorização: o `Employee` logado precisa ser o `barberId` do
appointment (ou admin do tenant). State machine central valida a
transição de origem (só `pending` confirma/recusa).

### 4. Refund coerente (payment-ready), mesmo no mock

Recusa e expiração chamam `PaymentService.refund(appointmentId)`:
`paid → refunded` + grava `refundedAt`. No mock não move dinheiro (não
há), mas mantém o registro consistente — quando o PSP real entrar (S21),
é só o provider implementar o refund de verdade. Evita Payment `paid`
órfão num appointment `cancelled/expired`.

Campo novo `Payment.refundedAt` (timestamptz, nullable).

### 5. Notificações em cada transição (push + email vintage)

| Evento | Quem | Canal |
|---|---|---|
| novo `pending` | barbeiro | push |
| `confirmed` | cliente | push + email vintage |
| recusado/`expired` | cliente | push + email vintage |

Push best-effort (não trava a transição, igual reminder). Email reusa a
estética vintage existente (novos templates `bookingConfirmedByBarber` e
`bookingRejectedOrExpired`).

### 6. Push do barbeiro registrado neste sprint

Hoje só o cliente registra `expoPushToken` (tabela `CustomerDevice`,
ligada a `customerPhone`). O barbeiro precisa receber push de novo
`pending`. Decisão: registrar device do barbeiro reusando a infra,
mas ligado ao `AppUser` (barbeiro é sempre logado), não ao telefone.

Tabela nova `EmployeeDevice` (espelha `CustomerDevice`):
`{ id, appUserId, expoPushToken unique, lastSeenAt }`. Mobile-business
registra no login/boot, igual o mobile-customer já faz.

### 7. Status em inglês no DB, PT na UI (mantido do ADR-016)

Sem mudança. Os labels PT já estão nas UIs (Fase 5 do S14).

---

## Schema (migration `s15_confirm_expiration`)

```prisma
model Appointment {
  // ... campos existentes ...
  confirmDeadline DateTime? @map("confirm_deadline") @db.Timestamptz(6)
}

model Payment {
  // ... campos existentes ...
  refundedAt DateTime? @map("refunded_at") @db.Timestamptz(6)
}

model EmployeeDevice {
  id            String   @id @default(uuid()) @db.Uuid
  appUserId     String   @map("app_user_id") @db.Uuid
  expoPushToken String   @unique @map("expo_push_token")
  lastSeenAt    DateTime @default(now()) @map("last_seen_at") @db.Timestamptz(6)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([appUserId])
  @@map("employee_devices")
}
```

Sem mudança de constraint: `expired` e `cancelled` já liberam o slot
(EXCLUDE só cobre awaiting_payment|pending|confirmed).

---

## Roadmap em fases

| Fase | Entrega |
|---|---|
| 1 | Migration + state machine central + `PaymentService.refund` + `scheduleExpiration` + worker de expiração |
| 2 | Endpoints barbeiro: `PATCH /me/appointments/:id/confirm` e `/reject` |
| 3 | Notificações (push + 2 templates vintage) em cada transição |
| 4 | `EmployeeDevice` + registro de push no mobile-business |
| 5 | UI mobile-business: lista de pendentes + botões confirmar/recusar |

Commit ao fim de cada fase. Sem push automático.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Race: barbeiro confirma no instante que o job expira | State machine valida origem `pending` numa transação; quem perde vê no-op. Job é idempotente. |
| Job de expiração roda mas appt já mudou | Job relê status antes de agir (padrão reminder). |
| Push do barbeiro sem device | Best-effort + fallback: lista in-app de pendentes sempre disponível. |
| Refund mock vira real no S21 | `refund()` já isola a lógica; provider real só implementa o método. |
