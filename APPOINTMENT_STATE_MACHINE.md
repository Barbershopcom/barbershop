# Máquina de Estados de Appointment (ADR-017)

## Visão Geral

Todo `Appointment` passa por uma máquina de estados bem definida. As transições são **atômicas** (executadas centralmente em `AppointmentStatusService`) para evitar race conditions entre múltiplos atores (barbeiro, job de expiração, cliente).

**Fonte canônica de status**: [packages/schemas/src/appointments.ts](packages/schemas/src/appointments.ts:18-26)

## Estados

| Status | Significado | Slot Ocupado? |
|--------|-------------|--------------|
| `awaiting_payment` | Reservou, não pagou ainda | ✅ Sim |
| `pending` | Pagou, aguardando barbeiro confirmar | ✅ Sim |
| `confirmed` | Barbeiro confirmou | ✅ Sim |
| `completed` | Corte realizado | ❌ Não |
| `cancelled` | Cancelado pelo barbeiro/cliente/sistema | ❌ Não |
| `expired` | Barbeiro não confirmou até o deadline | ❌ Não |
| `no_show` | Cliente não apareceu | ❌ Não |

**Slots ocupados**: Apenas `awaiting_payment|pending|confirmed` reservam horários (ver `slotOccupyingStatuses` em [packages/schemas/src/payment.ts](packages/schemas/src/payment.ts))

## Diagrama de Estados

```
                        ┌──────────────────────────┐
                        │   awaiting_payment       │
                        │  (cliente reservou)      │
                        └────────────┬─────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │ (pagamento    │               │ (cancelamento
                     │  aprovado)    │               │  por refund
                     ↓               ↓               │  ou timeout)
                  pending      [REFUND]         cancelled
                  (pago)       ↙               ↙
                     │                      ╱ (refund em caso
                     │ (barbeiro            │  de falha)
                     │  confirma)      ─────┘
                     ↓
                  confirmed
                (agendado)
                     │
        ┌────────────┼────────────┐
        │ (corte      │ (sistema   │ (não
        │  realizado) │  expira)   │  confirmou)
        ↓            ↓             ↓
      completed   expired      expired
    (finalizado) (vencido)   + REFUND
                              + NOTIFY
                     │ (refund)
                     ↓
                  cancelled
                     
        │ (cliente não
        │  apareceu)
        ↓
      no_show
   (sem refund)
```

## Transições Permitidas

### 1. **awaiting_payment → pending** (Sistema/PaymentWebhook)
- **Trigger**: Webhook MercadoPago confirma pagamento
- **Efeito colateral**: Nenhum (transição pura)
- **Condição**: Status debe ser `awaiting_payment`
- **Código**: [payment.service.ts:markPaid()](apps/api/src/payment/payment.service.ts)

### 2. **awaiting_payment → cancelled** (Sistema/PaymentFail)
- **Trigger**: Webhook MercadoPago rejeita pagamento OU timeout expirou
- **Efeito colateral**: Refund (se necessário)
- **Condição**: Status deve ser `awaiting_payment`
- **Código**: [payment.service.ts:markFailed()](apps/api/src/payment/payment.service.ts)

### 3. **pending → confirmed** (Barbeiro)
- **Trigger**: Barbeiro confirma via `/admin/appointments/:id/confirm`
- **Efeito colateral**: Notificação ao cliente
- **Condição**: Status deve ser `pending`
- **Código**: [appointment-status.service.ts:confirm()](apps/api/src/appointments/appointment-status.service.ts:42-46)

### 4. **pending → cancelled** (Barbeiro)
- **Trigger**: Barbeiro recusa via `/admin/appointments/:id/reject`
- **Efeito colateral**: Refund + Release coupon + Notificação
- **Condição**: Status deve ser `pending`
- **Código**: [appointment-status.service.ts:reject()](apps/api/src/appointments/appointment-status.service.ts:48-60)

### 5. **pending → expired** (Job)
- **Trigger**: Job de expiração (`appointment-expiration` queue) executa
- **Efeito colateral**: Refund + Release coupon + Notificação
- **Condição**: Status deve ser `pending` E startAt <= now
- **Código**: [appointment-status.service.ts:expire()](apps/api/src/appointments/appointment-status.service.ts:62-72)

### 6. **{awaiting_payment|pending|confirmed} → cancelled** (Barbeiro)
- **Trigger**: Barbeiro marca folga via `/admin/employees/:id/time-off`
- **Efeito colateral**: Refund + Release coupon + Notificação
- **Condição**: Status deve estar em `slotOccupyingStatuses`
- **Código**: [appointment-status.service.ts:cancelForTimeOff()](apps/api/src/appointments/appointment-status.service.ts:109-131)

### 7. **{awaiting_payment|pending|confirmed} → cancelled** (Cliente)
- **Trigger**: Cliente cancela via `/me/customer-appointments/:id/cancel`
- **Efeito colateral**: Release coupon + Notificação
- **Condição**: Status deve estar em `slotOccupyingStatuses` E estar dentro da janela de 24h antes do startAt
- **Código**: [me-customer-appointments.controller.ts:cancel()](apps/api/src/me/me-customer-appointments.controller.ts:126-206)

### 8. **confirmed → completed** (Barbeiro)
- **Trigger**: Barbeiro marca corte como concluído via `/admin/appointments/:id/complete`
- **Efeito colateral**: Incrementar contador de cortes do cliente
- **Condição**: Status deve ser `confirmed`
- **Código**: [appointment-status.service.ts:complete()](apps/api/src/appointments/appointment-status.service.ts:93-102)

### 9. **confirmed → no_show** (Barbeiro)
- **Trigger**: Barbeiro marca cliente faltou via `/admin/appointments/:id/no-show`
- **Efeito colateral**: Nenhum refund
- **Condição**: Status deve ser `confirmed`
- **Código**: [appointment-status.service.ts:noShow()](apps/api/src/appointments/appointment-status.service.ts:103-105)

## Efeitos Colaterais

### Refund (Reembolso)
Dispara quando:
- `pending → cancelled` (barbeiro recusa)
- `pending → expired` (tempo expirou)
- `awaiting_payment → cancelled` (pagamento falhou)

**Implementação**: [payment.service.ts:refund()](apps/api/src/payment/payment.service.ts)

### Release Coupon Reservation
Dispara quando qualquer transição leva a `cancelled`:
- `reject()`, `expire()`, `cancelForTimeOff()`, customer `cancel()`
- Decrementa `coupons.times_redeemed` para liberar a reserva

**Implementação**: [appointment-status.service.ts:releaseCouponReservation()](apps/api/src/appointments/appointment-status.service.ts:193-207)

### Notificação
Dispara quando:
- `pending → confirmed` (evento: `confirmed`)
- `pending → cancelled` (evento: `rejected`)
- `pending → expired` (evento: `expired`)

**Implementação**: Plugável via `AppointmentStatusService.registerNotifier()` → [appointment-notifier.service.ts](apps/api/src/appointments/appointment-notifier.service.ts)

## Race Conditions Resolvidas

### Barbeiro Confirma vs Job Expira
```
Barbeiro clica "Confirmar" no painel
  ↓
pending → confirmed (UPDATE WHERE id AND status='pending')
  ↓
Job expira 1s depois
  ↓
pending → expired (UPDATE WHERE id AND status='pending')
  ↓
UPDATE retorna 0 linhas (status já é 'confirmed')
  ↓
no-op seguro (idempotente)
```

**Implementação**: `transition()` usa UPDATE condicional + retorna count

### Cliente Cancela Simultaneamente com Barbeiro
```
Cliente: POST /me/customer-appointments/:id/cancel
Barbeiro: POST /admin/appointments/:id/confirm
  ↓ (paralelo)
Ambos tentam UPDATE
  ↓
Um vence (status muda para 'cancelled' ou 'confirmed')
  ↓
Outro recebe count=0 (idempotente)
```

**Segurança**: UPDATE é atômico; um lado sempre vence primeiro.

## Fluxos Ideais

### Happy Path (Sucesso)
```
POST /public/slots/book
  → awaiting_payment (cliente reservou)
  
Webhook MercadoPago (payment approved)
  → pending (pagamento confirmado)
  
Barbeiro confirma
  → confirmed (pronto pra executar)
  
Barbeiro marca concluído
  → completed (fim)
```

### Cliente Cancela (24h antes)
```
awaiting_payment/pending/confirmed
  + canCancelAppointment() = true (24h antes do startAt)
  → cancelled + release coupon
```

### Barbeiro Recusa
```
pending
  + rejeta
  → cancelled + refund + release coupon + notifica cliente
```

### Timeout Expiração
```
pending
  + job de expiração executa
  + startAt <= now
  → expired + refund + release coupon + notifica cliente
```

## Segurança

### Garantias
1. **Atomicidade**: UPDATE condicional em transação Prisma
2. **Idempotência**: Transições no-op se status não bate
3. **Autenticação**: Cada transição valida permissão (barbeiro, cliente, sistema)
4. **Compensação**: Refund e release coupon são best-effort (logged se falhar)

### Validações
- `barber_id` deve ser do tenant correto (RLS)
- `startAt` deve ser no futuro (schema refine)
- `cancelWindowHours` verificado antes de permitir cancel
- Customer email vs customerId validado pós-query

## Próximas Melhorias (Sprint 8+)

1. **Webhook Retry Loop**: Implementar retry exponencial pra confirmações de pagamento
2. **Partial Refund**: Suportar reembolsos parciais (ex: taxa de cancelamento)
3. **Reschedule**: Permitir reagendamento sem cancelar (transição direta)
4. **Notification Guarantee**: Garantir que notificações não são dropadas (message queue)
5. **Analytics**: Tracking de transições pra entender fluxos reais

## Referências

- **ADR-017**: Central appointment state machine (ver decisão no projeto)
- **ADR-018**: Barbeiro workflow (confirmação, no-show)
- **ADR-021**: Coupon reservation e release
- **ADR-022**: Payment webhook e status update
- [appointment-status.service.ts](apps/api/src/appointments/appointment-status.service.ts)
- [payment.service.ts](apps/api/src/payment/payment.service.ts)
