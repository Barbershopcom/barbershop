# Mercado Pago — setup & checklist de validação (ADR-022)

Guia pra ligar o pagamento real (marketplace/split). **Sempre comece em
sandbox/teste.** Nenhum dinheiro real até o fluxo passar ponta-a-ponta.

## 1. O que você cria no painel do Mercado Pago

1. Conta MP + acesse **Suas integrações** (developers.mercadopago.com).
2. Crie uma **aplicação** do tipo *Pagamentos online / Marketplace*.
3. Em **Credenciais de teste**, pegue:
   - `Access Token` (de teste) → `MERCADOPAGO_ACCESS_TOKEN`
   - `Client ID` → `MERCADOPAGO_CLIENT_ID`
   - `Client Secret` → `MERCADOPAGO_CLIENT_SECRET`
4. Configure o **Redirect URI** do OAuth na app = `MERCADOPAGO_OAUTH_REDIRECT_URI`
   (ex.: `http://localhost:3000/admin/mp/callback`).
5. Em **Webhooks**, configure a URL `=$API_PUBLIC_URL/webhooks/mercadopago`
   e copie a **chave secreta** → `MERCADOPAGO_WEBHOOK_SECRET`.
6. Crie **usuários de teste** (vendedor + comprador) em *Contas de teste*.

## 2. Variáveis (.env da API — nunca commitar)

Veja `apps/api/.env.example` (seção Pagamento). Resumo:

| Var | Pra quê |
|---|---|
| `PAYMENT_PROVIDER` | `mock` (dev) → `mercadopago` (quando for testar real) |
| `MERCADOPAGO_ACCESS_TOKEN` | token da plataforma (teste) |
| `MERCADOPAGO_CLIENT_ID/SECRET` | OAuth Connect |
| `MERCADOPAGO_OAUTH_REDIRECT_URI` | callback do web admin |
| `MERCADOPAGO_WEBHOOK_SECRET` | assinatura do webhook (obrigatório em prod) |
| `API_PUBLIC_URL` | URL pública da API (pro notification_url) |

Em dev, exponha a API com **ngrok**/**cloudflared** e ponha a URL em
`API_PUBLIC_URL` (o MP precisa alcançar o webhook).

## 3. Pré-requisitos de infra (hoje bloqueados offline)

- [ ] VPN/Neon de volta → `pnpm --filter api prisma migrate deploy`
      (aplica `20260604120000_s21_tenant_mp_connect` + as 3 anteriores).
- [ ] `pnpm --filter api test` → confirmar 56/56.

## 4. Checklist de validação em sandbox

1. [ ] `PAYMENT_PROVIDER=mercadopago` + credenciais de teste no `.env`.
2. [ ] API exposta via ngrok; `API_PUBLIC_URL` setado; webhook cadastrado no MP.
3. [ ] **Conectar conta** (split): logado como admin no web →
       `GET /admin/mp/connect-url` → abrir no navegador como **vendedor de
       teste** → autorizar → o web chama `POST /admin/mp/connect` →
       `GET /admin/mp/status` deve dar `connected: true`.
4. [ ] **Pix**: criar um booking → `POST /public/appointments/:id/payment/pay`
       com `method: pix` → recebe `pixQrCode` + `pixQrCodeBase64`,
       appointment fica `awaiting_payment`.
5. [ ] Pagar o Pix com o **comprador de teste** → o **webhook** chega →
       `markPaid` → appointment vira `pending` (aguardando barbeiro) →
       `GET /public/appointments/:id/payment` mostra `status: paid`.
6. [ ] **Split**: confirmar no painel do vendedor que ele recebeu o valor
       do serviço e a plataforma recebeu o `application_fee` (15%).
7. [ ] **Refund**: recusar/expirar o appointment → `refund()` chama o MP →
       conferir estorno no painel + `Payment.status = refunded`.

## 5. Pendências de código (pós-sandbox)

- [ ] **Refresh de token do vendedor** antes do charge quando
      `mpTokenExpiresAt` vencer (método `refreshOAuthToken` já existe no
      provider; falta o gatilho no `PaymentService.pay()`).
- [ ] **Tela Pix real** (mobile/web): QR (base64) + copia-e-cola +
      countdown 10min + polling de `GET .../payment` (endpoint já existe).
- [ ] Botão **Conectar Mercado Pago** no admin web (consome
      `/admin/mp/connect-url` + página `/admin/mp/callback`).
- [ ] Cartão: tokenização no cliente (MP.js) antes de `pay()` com `cardToken`.

## 6. Produção

- Credenciais de **produção** vão direto nas variáveis do **Railway**
  (não no chat, não no git).
- `MERCADOPAGO_WEBHOOK_SECRET` é **obrigatório** em produção (o webhook
  rejeita sem ele — fail-closed).
- Trocar `MERCADOPAGO_OAUTH_REDIRECT_URI` e `API_PUBLIC_URL` pras URLs reais.
