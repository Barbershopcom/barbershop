# Cancelamento com multa (late-cancel fee) — Design

- **Data:** 2026-06-22
- **Status:** Aprovado (design) — pronto pra plano
- **Apps:** `apps/api` (regra + schema), `packages/schemas`, `apps/web` (config admin/onboarding), `apps/mobile-customer` (modal).

## 1. Contexto e objetivo

Hoje o cancelamento é **bloqueado** com menos de 24h de antecedência
(`me-customer-appointments.controller.ts` → 403 "Só é possível cancelar com
24h"). Novo comportamento: **permitir** o cancelamento tardio, mas aplicando
uma **multa** (late-cancel fee). O cliente vê a multa e o reembolso antes de
confirmar.

## 2. Decisões (travadas)

1. **Multa = % do preço, configurável por barbearia.** Campo novo no schema,
   default 50%. O dono ajusta no admin/onboarding.
2. **Reembolso = preço − multa, calculado e registrado agora.** A **execução
   real do estorno no Mercado Pago (dinheiro saindo)** fica pro **go-live de
   pagamento** — localmente o provider mock já faz no-op marcando `refunded`.
3. Cancelamento **≥24h**: sem multa, reembolso integral (comportamento "grátis").
   Cancelamento **<24h**: multa = `preço × pct`, reembolso = `pago − multa`.

## 3. Mudanças de schema (migration)

- `barbershops.lateCancelFeePct Int @default(50)` — % da multa de cancelamento
  tardio por barbearia.
- `payments.cancelFeeCents Int @default(0)` — multa aplicada no cancelamento
  (reembolso efetivo = `amountCents − cancelFeeCents`).

Migration aplicada no Postgres local (`test:db:migrate`); no go-live roda no
banco de produção.

## 4. Backend (`apps/api`)

**`PaymentService.refund(appointmentId, feeCents = 0)`** — estender:
- Aceita `feeCents` (multa). Marca `payment.status='refunded'`, `refundedAt`,
  e grava `cancelFeeCents=feeCents`. Chama `provider.refund(...)` (mock no-op;
  PSP real no go-live). Mantém idempotência/best-effort atuais.

**`MeCustomerAppointmentsController.cancel`**:
- **Remove** o bloqueio 403 de 24h.
- Calcula `isLate = now > startAt − 24h`.
- Carrega `barbershop.lateCancelFeePct` (via tenant/barbershop do appointment)
  e o `payment.amountCents` (se houver pagamento).
- `feeCents = isLate ? round(amountCents × pct/100) : 0`.
- Marca appointment `cancelled` (como hoje) + chama `payment.refund(id, feeCents)`.
- Libera reserva de cupom (já existe).
- Retorna `{ feeCents, refundCents }` (ou 204 + o cliente relê) — ver §6.

**Preview da multa** (pro cliente ver antes de confirmar): expor no item de
`GET /me/customer-appointments` um bloco `cancellation: { isLate, feeCents,
refundCents }` calculado pelo servidor (fonte da verdade), usando o preço pago
e o `lateCancelFeePct` da barbearia. Evita duplicar a regra no cliente.

## 5. Admin / Onboarding (`apps/web`)

- **Onboarding** (`createTenantOnboardingSchema` / form): campo opcional
  "Multa de cancelamento tardio (%)" com default 50.
- **Admin** (perfil/config da barbearia): editar o `lateCancelFeePct`.
- Validação: inteiro 0–100.

## 6. Cliente (`apps/mobile-customer`)

- O `CancelModal` (já existe, criado em `meus-agendamentos.tsx`) passa a
  mostrar, quando `cancellation.isLate`: "Cancelar com menos de 24h tem multa
  de R$X (Y%). Você recebe R$Z de volta." + confirmar.
- Quando `≥24h`: texto sem multa (reembolso integral).
- Usa o bloco `cancellation` do item (servidor) pra exibir valores exatos.

## 7. Contratos (`packages/schemas`)

- `MyCustomerAppointmentItem` ganha `cancellation: { isLate: boolean;
  feeCents: number; refundCents: number }`.
- Schema de onboarding/tenant-profile ganha `lateCancelFeePct` (int 0–100,
  default 50).

## 8. Fora de escopo (go-live de pagamento)

- **Estorno real no Mercado Pago** (dinheiro de fato voltando) — entra na
  passada de produção do MP, junto de webhooks/refund real. Aqui só calcula,
  registra e chama o `provider.refund` (mock no-op).

## 9. Testes

- API (integração, padrão `me-customer.controller.spec`):
  - cancel ≥24h → fee=0, refund integral, sem 403.
  - cancel <24h → fee = preço×pct, payment refunded com `cancelFeeCents`.
  - pct configurável reflete no cálculo.
- Sem regressão na suíte atual.

## 10. Riscos

- **Migration**: roda só no Postgres local agora (Neon fora por cota). No
  go-live precisa rodar em produção.
- **Movimento de dinheiro**: o reembolso real fica adiado; deixar claro no
  código (comentário) que `provider.refund` é no-op no mock.
- **Preço pago vs preço do serviço**: usar `payment.amountCents` (o que foi
  pago) como base do reembolso; a multa é sobre o preço do serviço
  (`appointment.priceCents`) — alinhar qual base no plano (decisão: multa
  sobre o **preço do serviço**, reembolso sobre o **valor pago**).
