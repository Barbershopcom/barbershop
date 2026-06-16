# P0 #5 Refactoring Plan: Eliminar ciclo AppointmentStatus ↔ PaymentService

## Problema

Ciclo de dependências via `forwardRef`:
- `AppointmentsModule` → `PaymentModule`
- `PaymentModule` → `AppointmentsModule` (via `AppointmentNotifier`)
- Ambos injetam via `forwardRef(() => OtherModule)`

Acoplamento mascarado; mudanças em interfaces causam quebra cascata.

## Solução: Mediator Pattern

Criar `AppointmentMediator` que coordena transições e refunds, permitindo que ambos os services injetem apenas o mediador (sem ciclo).

### Arquivos afetados

1. **NEW:** `apps/api/src/appointments/appointment-mediator.service.ts`
   - Coordena transições + refunds
   - Orquestra `AppointmentStatusService` e `PaymentService`
   - Sem `forwardRef`

2. **REFACTOR:** `apps/api/src/appointments/appointment-status.service.ts`
   - Remove `@Inject(forwardRef(() => PaymentService))`
   - Injeta `AppointmentMediator` ao invés
   - Chama `mediator.requestRefund(appointmentId)` em transições

3. **REFACTOR:** `apps/api/src/payment/payment.service.ts`
   - Remove `@Inject(forwardRef(() => AppointmentNotifier))`
   - Injeta `AppointmentMediator` ao invés
   - Chama `mediator.notifyTransition(...)` após pagamento

4. **REFACTOR:** `apps/api/src/appointments/appointments.module.ts`
   - Remove `forwardRef(() => PaymentModule)`
   - Importa apenas `AppointmentMediator`

5. **REFACTOR:** `apps/api/src/payment/payment.module.ts`
   - Remove `forwardRef(() => AppointmentsModule)`
   - Importa apenas `AppointmentMediator`

### Novo diagrama de dependências

```
AppointmentStatusService
    ↓
AppointmentMediator ← (injeta)
    ↑
PaymentService

// Sem ciclo, sem forwardRef
```

### Implementação (Sprint 2)

1. Criar `AppointmentMediator` com interface clara
2. Adaptar `AppointmentStatusService.reject()` → `mediator.requestRefund()`
3. Adaptar `AppointmentStatusService.expire()` → `mediator.requestRefund()`
4. Adaptar `PaymentService.markPaid()` → `mediator.notifyTransition()`
5. Remover `forwardRef` de ambos modules
6. Testes: validar que refund é solicitado após transição

### Escopo Sprint 2

- ~3-4 horas
- Não quebra API pública
- Melhora maintainability

## Status

- [x] Identificado problema
- [ ] Implementar mediator
- [ ] Adaptar services
- [ ] Testes
- [ ] Remover forwardRef
