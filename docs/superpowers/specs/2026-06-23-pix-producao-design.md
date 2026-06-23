# PIX em produção (go-live piloto) — Design / Fase A

- **Data:** 2026-06-23
- **Status:** Aprovado (design) — pronto pra plano
- **Escopo:** Habilitar **pagamento PIX real em produção** (marketplace/split via Mercado Pago), piloto com 1 barbearia (a do dono). Cartão = Fase B (spec separado).

## 1. Contexto

O subsistema de pagamento PIX **já está construído e endurecido** (ADR-022, S21):
- Marketplace/split: cobra na conta do vendedor (`sellerAccessToken`) com `application_fee` = comissão da plataforma.
- Charge PIX (`/v1/payments`) já envia `external_reference=appointmentId`, `notification_url` e `application_fee`.
- Webhook (`mercadopago-webhook.controller`): valida assinatura `x-signature`, deduplica, e em `approved` chama `markPaid` (confirma o agendamento); rejected/cancelled → `markFailed`.
- OAuth do vendedor: connect/disconnect/refresh (`admin-mp.controller`, `getValidSellerToken` renova perto de expirar). Web tem `admin/pagamentos` + `admin/mp/callback`.
- `env.ts` exige as 5 vars do MP quando `PAYMENT_PROVIDER=mercadopago`.
- DB de produção (Neon) está **vivo** (upgrade feito).

**Portanto Fase A é ~95% go-live (ops do dono) + security review + 2 conferências de config. Sem gap de código de pagamento.**

## 2. Decisões

1. **Marketplace/split** (já é assim): cada barbearia conecta o MP dela; plataforma retém `application_fee`.
2. **Piloto: 1 barbearia (a do dono)** conecta o MP real e valida com transações reais pequenas (R$1) antes de abrir.
3. **Só PIX nesta fase.** Cartão (tokenização no cliente) = Fase B.

## 3. Runbook de go-live (dono — ops, em ordem)

1. **DB de produção:** Neon upgrade ✅. Rodar `prisma migrate deploy` na produção (aplica late-cancel e demais). Resolver o drift `slot_interval_min` + o checksum do `late_cancel_fee` (`prisma migrate resolve --applied ...`) num terminal real antes do deploy.
2. **App MP produção:** criar a aplicação no painel do Mercado Pago (modo produção):
   - Pegar `MERCADOPAGO_ACCESS_TOKEN` (APP_USR, da plataforma), `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`.
   - Gerar `MERCADOPAGO_WEBHOOK_SECRET`.
   - **OAuth redirect URI** = `https://<web>/admin/mp/callback`.
   - **Webhook (notification_url)** = a env que o `notificationUrl()` lê (confirmar nome no §5) → apontar pro endpoint do webhook na API pública.
   - Verificar a conta MP (pode demorar — começar cedo).
3. **Deploy:** API (Railway) + Web (Vercel) com env de produção:
   - `PAYMENT_PROVIDER=mercadopago` + as 5 vars MP + `MERCADOPAGO_NOTIFICATION_URL` (ou nome real).
   - `DATABASE_URL`/`DIRECT_URL` (Neon prod), `NEXT_PUBLIC_API_URL` (api domínio), `NEXT_PUBLIC_CUSTOMER_APP_URL=https://appbarbeariab.com`, `CORS_ORIGINS` (domínios web/app).
   - DNS no domínio (api., web/app).
4. **Conectar MP:** no admin (`/admin/pagamentos`), a barbearia do dono conecta a conta MP real (OAuth).
5. **Piloto:** criar um agendamento real e pagar **R$1 via PIX** com app de banco real → validar:
   - QR/copia-e-cola abre no banco e paga.
   - Webhook chega, assinatura válida, `markPaid` confirma o agendamento (status pending/confirmed).
   - `application_fee` (comissão) aparece no split do MP.
   - Refund (cancelar) estorna no MP.

## 4. Trabalho de código (meu — pequeno, antes de dinheiro real)

1. **Security review** do subsistema de pagamento (foco em dinheiro real):
   - Verificação de assinatura do webhook (`mercadopago-signature.ts`): manifesto/HMAC correto, timing-safe, rejeita ausente/inválida.
   - Deduplicação/idempotência do webhook (replays).
   - Armazenamento dos tokens do vendedor (não vazam em GET/logs; refresh seguro).
   - `state` do OAuth assinado/verificado (anti-CSRF) no connect.
   - Sem segredo em log.
2. **Conferir** o valor/política da **comissão da plataforma** (`breakdown.platformFeeCents` em `payment.service`): confirmar como é calculado (fixo vs %) e que o número está correto pra produção.
3. **Conferir** a env de `notificationUrl()` (qual nome) e documentar pra setar em prod; idem `CORS_ORIGINS` cobrindo o domínio.

## 5. A confirmar no código (durante o plano)
- Nome exato da env lida por `MercadoPagoProvider.notificationUrl()`.
- Fórmula de `platformFeeCents` (breakdown) — fixo ou %.

## 6. Fora de escopo
- **Cartão** (tokenização MP.js/Bricks no cliente) → Fase B.
- Abertura pra múltiplas barbearias (piloto é 1).

## 7. Riscos
- **Dinheiro real**: erro custa dinheiro — daí o security review + piloto R$1 antes de abrir.
- **Verificação do MP produção**: burocrática/lenta; começar já.
- **Webhook inalcançável**: se a notification_url/DNS/HTTPS não estiver certa, pagamentos ficam "pending" pra sempre — validar no piloto.
- **Tokens do vendedor**: expiração/refresh; segredos no DB.
