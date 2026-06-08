# ADR-021: Sprint 19 — Promoções (cupons de desconto)

- **Data:** 2026-06-08
- **Status:** Aprovado
- **Supersedes:** nada (continua ADR-015 roadmap, segue ADR-020)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

O roadmap (ADR-015) prevê "Promoções" no S19 sem detalhar o formato.
Decisão: o primitivo mais universal e de menor risco pré-pagamento real é
o **cupom de desconto** — a barbearia cria um código, o cliente aplica no
booking, o desconto reduz o preço snapshot do appointment.

Fidelidade automática ("a cada N cortes, 1 grátis", usando o contador do
S17) é tentadora mas é essencialmente um cupom auto-gerado + resgate; fica
**deferida** pra manter o sprint em 4-5 dias.

---

## Decisões

### 1. Modelo `Coupon` (tenant-scoped)

| Campo | Tipo | Nota |
|---|---|---|
| code | String | único por tenant (`@@unique([tenantId, code])`), case-insensitive na validação |
| description | String? | rótulo interno/cliente |
| discountType | 'percent' \| 'fixed' | |
| discountValue | Int | percent: basis points (1000 = 10%); fixed: centavos |
| minOrderCents | Int? | valor mínimo do serviço pra valer |
| validFrom / validUntil | DateTime? | janela; null = sem limite |
| maxRedemptions | Int? | null = ilimitado |
| timesRedeemed | Int @default(0) | contador (guard atômico) |
| isActive | Boolean @default(true) | desliga sem apagar |

Escopo por serviço fica **fora** do MVP (cupom vale pro appointment todo).

### 2. Modelo `CouponRedemption` (tenant-scoped)

`couponId`, `appointmentId` (**unique** — 1 cupom por appointment),
`customerEmail?`, `discountCents` (o desconto real aplicado), `createdAt`.
Auditoria + base pra "1 uso por cliente" no futuro.

### 3. Cálculo (pura, no pacote schemas)

`computeCouponDiscount(base, coupon) → discountCents`:
- percent: `floor(base * value / 10000)`
- fixed: `min(value, base)`
- nunca passa do `base` (preço final ≥ 0).

`validateCoupon(coupon, { base, now })` → ok | motivo (`inactive` |
`not_started` | `expired` | `exhausted` | `below_min`).

### 4. Integração no booking

`bookAppointmentSchema` ganha `couponCode?`. No `BookingService.book`:
1. resolve serviço (base = `basePriceCents`);
2. se há `couponCode`: resolve cupom por (tenant, code), valida; computa
   `discountCents`; `priceCents = base - discount`;
3. cria appointment com `priceCents` já com desconto;
4. **guard atômico** de resgate: `UPDATE coupons SET times_redeemed+1
   WHERE id=? AND (max_redemptions IS NULL OR times_redeemed <
   max_redemptions)`. Se 0 linhas (esgotou numa corrida): reverte
   `appointment.priceCents` pro base e **não** cria redemption (cliente
   pagou cheio — coerente); senão cria `CouponRedemption`.

Trade-off aceito: validar antes + guard atômico depois pode, em corrida
rara de esgotamento, reverter pro preço cheio em vez de recusar o booking.
Preferível a transação distribuída; com pagamento mock é inofensivo.

### 5. Preview público (UX do booking)

`POST /public/tenants/:slug/coupons/validate { code, serviceId }` →
`{ valid, discountCents?, finalPriceCents?, reason? }`. O front mostra o
desconto **antes** de confirmar. Re-validação no `book` é a fonte de
verdade (preview é só UX).

### 6. RLS e acessos

`coupons`/`coupon_redemptions` tenant-scoped com policy padrão. Admin
gerencia via `@Tx` (membro). Validação pública + booking via bypassRLS +
filtro explícito por `tenantId` (igual /slots, /discover).

---

## Fases

1. **Backend dados**: models `Coupon`/`CouponRedemption` + migration
   idempotente + RLS; pacote schemas `coupon.ts` (CRUD schemas, pure
   `computeCouponDiscount`/`validateCoupon`, DTOs).
2. **API**: admin CRUD `/admin/coupons`; preview público; integração no
   `BookingService` (aplica + guard atômico de resgate).
3. **mobile-customer**: campo de cupom no fluxo de booking (aplica →
   mostra desconto/preço final).
4. **mobile-business**: tela de gestão de cupons (lista/criar/ativar).

---

## Consequências

- Barbearia ganha alavanca de aquisição/retenção sem depender do PSP real.
- Desconto entra no `priceCents` snapshot → quando o pagamento real chegar
  (S21), o split já cobra o valor com desconto, sem refactor.
- Fidelidade automática reaproveita esse motor depois (cupom auto-gerado).

---

## Riscos

- 🟡 Abuso de cupom (compartilhamento) → mitigado por `maxRedemptions` +
  janela; "1 por cliente" fica pro futuro via `CouponRedemption`.
- 🟢 Over-redemption em corrida → guard atômico no contador resolve.
