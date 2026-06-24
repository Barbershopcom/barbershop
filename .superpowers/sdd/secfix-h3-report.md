# Secfix H3 — Possession Proof for POST /public/appointments/:id/payment/pay

**Date:** 2026-06-24
**Finding:** H3 — Public pay endpoint has no appointment-ownership check.
**Status:** Fixed and verified.

---

## How possession is proven

The fix reuses the existing HMAC cancel-token mechanism (`apps/api/src/slots/cancel-token.ts`):

1. **At booking time** (`BookingService.book`): immediately after the appointment is INSERTed, the server encodes a `CancelTokenPayload { apptId, exp: startAt }` signed with `APPOINTMENT_CANCEL_SECRET` via `encodeCancelToken`. This token is returned in the `BookedAppointment` response as the new optional field `cancelToken`.

2. **At pay time** (`PaymentController.pay`): the endpoint now requires `?token=<signed-token>` as a query parameter. Before calling `PaymentService.pay`, the controller:
   - Rejects with 403 `ForbiddenException` if the token is absent.
   - Calls `decodeCancelToken(token, secret)` — which verifies the HMAC signature timing-safely and checks expiry.
   - Additionally checks that `decoded.payload.apptId === id` (URL param UUID) — prevents a valid token for appointment A being reused on appointment B.
   - Only calls `PaymentService.pay` if all checks pass.

The token expires at `appointment.startAt` (same TTL as the cancel link), so a token issued for a future appointment naturally becomes invalid after the slot passes.

---

## Files changed

| File | Change |
|---|---|
| `packages/schemas/src/book-appointment.ts` | Added optional `cancelToken: z.string().optional()` to `bookedAppointmentSchema`. Rebuilt `dist/`. |
| `apps/api/src/slots/booking.service.ts` | After INSERT, encodes `cancelToken` via `encodeCancelToken` and includes it in the `BookedAppointment` response object. |
| `apps/api/src/payment/payment.controller.ts` | Added `ConfigService` + `decodeCancelToken` imports; added `@Query('token') token` param; added possession check (absent → 403, bad sig → 403, wrong apptId → 403). |
| `apps/mobile-customer/src/lib/booking-context.tsx` | Added `paymentToken: string | null` to `BookingState` and `setPaymentToken` to context value + implementation. |
| `apps/mobile-customer/app/(public)/agendamento/[slug]/pagamento.tsx` | After booking POST, stores `booked.cancelToken` via `booking.setPaymentToken`; appends `?token=<possessionToken>` to the pay POST URL; throws explicit error if token is absent (defensive guard). |
| `apps/api/test/payment-security.spec.ts` | Added H3 describe block with 4 tests (see below). Also added imports for `PaymentController` and `encodeCancelToken`. |

---

## Where the token is threaded

```
BookingService.book()
  → INSERT appointment
  → encodeCancelToken({ apptId, exp: startAt }, APPOINTMENT_CANCEL_SECRET)
  → BookedAppointment.cancelToken  ← returned to client

pagamento.tsx: handleConfirm()
  → api.post(…/appointments)  ← books slot
  → booked.cancelToken        ← received
  → booking.setPaymentToken(booked.cancelToken)
  → api.post(…/payment/pay?token=<cancelToken>)

PaymentController.pay(@Query('token') token)
  → decodeCancelToken(token, APPOINTMENT_CANCEL_SECRET)
  → assert decoded.payload.apptId === id
  → PaymentService.pay(…)  ← only reached if checks pass
```

---

## TDD evidence

**Test suite:** `apps/api/test/payment-security.spec.ts` — describe block `H3 — POST /pay exige token de posse (anti-griefing)`

| Test | Expectation | Result |
|---|---|---|
| Token absent (`undefined`) | ForbiddenException (status 403); charge not called | PASS |
| Token with wrong secret (bad HMAC) | ForbiddenException (status 403); charge not called | PASS |
| Token signed correctly but for a different apptId | ForbiddenException (status 403); charge not called | PASS |
| Valid token (correct secret + matching apptId, future exp) | Payment proceeds; `payment.status = 'paid'`; appointment `status = 'pending'` | PASS |

Full suite run: **91 tests, 10 suites — all passed**.

---

## Typecheck

- `pnpm --filter @barbearia/api typecheck` → **0 errors**
- `pnpm --filter @barbearia/mobile-customer typecheck` → **0 errors**

Note: `@barbearia/schemas` was rebuilt (`pnpm --filter @barbearia/schemas build`) before typechecking consumers, since it compiles to `dist/`.

---

## Concerns / limitations

1. **Token re-use within TTL:** the token is valid until `startAt`. A legitimate customer who bookmarks the `pay` URL with the token embedded could invoke it multiple times. This is safe because `PaymentService.pay` is idempotent (already-paid appointments return the existing `PaymentDto` without re-charging, guarded at `service.ts:133-135`).

2. **Idempotency key and retry:** if the booking call succeeds but the client loses the response (network drop), the client will retry with the same idempotency key and receive the cached `BookedAppointment` (including the same `cancelToken`) from `idempotency_keys`. No new token is issued; the same token works.

3. **Token in URL (logs):** `?token=` appears in access logs. This is the same trade-off as the cancel magic link and is acceptable per ADR-006 §9 rationale. The token is scoped to one appointment, expires at `startAt`, and only enables initiating a charge (not reading data or cancelling).

4. **`APPOINTMENT_CANCEL_SECRET` not set:** the controller throws a hard `Error` (500) if the env var is missing. In practice, env.ts validates this at startup with a default dev value, so it is always set unless misconfigured. The error surfaces loudly rather than silently bypassing the check.

5. **`bookAsAdmin` does not return `cancelToken`:** admin-created appointments use a different flow (born `confirmed`, no online payment). The field is `optional` in the schema so this is type-safe and intentional.
