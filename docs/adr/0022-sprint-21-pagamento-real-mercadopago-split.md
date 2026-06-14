# ADR-022: Sprint 21 — Pagamento real (Mercado Pago, marketplace/split)

- **Data:** 2026-06-11
- **Status:** Aprovado
- **Supersedes:** troca o `MockPaymentProvider` (ADR-016 §5) pelo PSP real
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

A arquitetura é payment-ready desde o S14 (ADR-016 §5): `PaymentProvider`
(interface) + `MockPaymentProvider`, injetados via token `PAYMENT_PROVIDER`.
O `PaymentService.pay()` já trata `charge()` devolvendo `pending` (fica em
`awaiting_payment` até o webhook). Agora entra o PSP real.

Decisões do dono (confirmadas): **Mercado Pago**, **marketplace/split**,
**sandbox primeiro**.

---

## Decisões

### 1. Mercado Pago via REST API (`fetch`), sem SDK

Não instalamos o pacote `mercadopago` — usamos a **API REST** via `fetch`.
Motivos: sem dependência nova (o registry/VPN está intermitente), controle
total do payload, e o webhook/refund são poucos endpoints. Base
`https://api.mercadopago.com` (env-overridable).

### 2. Marketplace/split (nunca float próprio) — ADR-015

Cada barbearia **conecta a própria conta MP via OAuth** (MP Connect). Ao
cobrar, a plataforma cria o pagamento **com o `access_token` do vendedor**
(a barbearia) e passa `application_fee = platformFeeCents` (15%). O dinheiro
do serviço cai direto na conta da barbearia; a comissão é roteada pra
plataforma pelo MP. **A plataforma nunca segura float** → sem risco BACEN.

Campos novos no `Tenant` (MP Connect):
`mpUserId`, `mpAccessToken`, `mpRefreshToken`, `mpTokenExpiresAt`,
`mpConnectedAt`. Tokens são segredos → nunca logados, nunca no git.

### 3. Fluxo de cobrança

| Método | charge() |
|---|---|
| Pix | cria payment `payment_method_id=pix` → status `pending` + devolve `qr_code` (copia-e-cola) e `qr_code_base64`. Expira em 10 min. |
| Cartão | recebe `card_token` do front (MP.js tokeniza no cliente — PCI), cria payment com parcelas → `approved`/`in_process`/`rejected`. |

`status` inicial é `pending` (Pix) → `pay()` mantém `awaiting_payment`. O
**webhook** confirma e chama `markPaid()`.

### 4. Webhook + markPaid (idempotente)

`POST /webhooks/mercadopago` (público, sem auth de usuário):
1. Verifica assinatura `x-signature` (HMAC SHA256 com `MERCADOPAGO_WEBHOOK_SECRET`, conforme template `id` + `request-id` + `ts`).
2. Busca o pagamento na API MP (fonte de verdade — não confia no corpo).
3. `approved` → `PaymentService.markPaid(appointmentId)`: `awaiting_payment
   → pending` + agenda expiração + avisa barbeiro. **Idempotente** por
   `providerPaymentId` (se já `paid`, no-op). `rejected/cancelled` →
   marca `failed`.
4. Responde 200 rápido (reprocessa em retry do MP se falhar).

### 5. Refund real

`PaymentProvider` ganha `refund(providerPaymentId)`. O `MercadoPagoProvider`
chama `POST /v1/payments/{id}/refunds` (refund total) com o token do
vendedor; o MP estorna proporcionalmente o `application_fee`.
`PaymentService.refund()` passa a chamar `provider.refund()` antes de marcar
`refunded` no banco (mock vira no-op no provider).

### 6. Binding por env

`PAYMENT_PROVIDER=mock|mercadopago` (default `mock`). Dev/test = mock;
produção = mercadopago. Zero mudança na state machine do appointment.

### 7. Tela Pix real (substitui o mock)

App cliente: após `pay()` com Pix → tela com QR (base64) + copia-e-cola +
countdown 10min + **polling** do status (`GET /me/.../payment`) →
sucesso quando `paid`. Web booking idem.

---

## Fases

1. **Base**: env MP; `refund()` na interface + mock; campos MP Connect no
   `Tenant` + migration idempotente.
2. **Provider**: `MercadoPagoProvider` (charge Pix/cartão + `application_fee`
   + refund) via `fetch`; binding por env.
3. **Webhook + markPaid**: controller público com verificação de assinatura
   + dedup; `PaymentService.markPaid()`.
4. **OAuth Connect**: fluxo de conectar a conta MP do tenant (admin) +
   refresh de token.
5. **Tela Pix real** (mobile + web) com polling.

---

## Segurança

- Segredos (access tokens, client secret, webhook secret) só em `.env`
  (gitignored) / Railway. Nunca logados, nunca commitados.
- **Sandbox primeiro**: usuários/cartões de teste do MP; nenhum dinheiro
  real até validar webhook + split + refund ponta-a-ponta.
- Webhook valida assinatura E re-busca o pagamento na API (não confia no
  corpo) — evita spoofing.
- Tokenização de cartão no cliente (MP.js) — o backend nunca vê PAN (PCI).

---

## Riscos

- 🔴 Token do vendedor expira → refresh OAuth automático antes do charge.
- 🟠 Webhook duplicado/atrasado → idempotência por `providerPaymentId`.
- 🟠 Refund parcial de `application_fee` → confiar no comportamento do MP;
  reconciliar via `providerPayload`.
- 🟡 Pix expira (10min) sem pagar → appointment segue `awaiting_payment`;
  job de limpeza opcional (futuro).

---

## Bloqueios atuais (offline)

Código + testes de unidade são escritos agora. Validação end-to-end precisa
de: VPN/Neon (migrations), credenciais sandbox do MP, e URL pública pro
webhook (ngrok/cloudflared em dev).
