# ADR-011: Sprint 10 — Deploy em produção

- **Data:** 2026-05-28
- **Status:** Aprovado
- **Supersedes:** nada (executa a stack definida em ADR-002)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Após 9 sprints, o produto está completo em localhost: API multi-tenant,
admin web, mobile business, web pública de booking, mobile customer com
push. ADR-002 (Stack & Auth) já decidiu **Vercel + Railway + Neon** como
infra. Sprint 10 executa esse deploy.

Sem produção, nenhuma das features anteriores ajuda barbearia real —
ninguém entra em `localhost:3000`. Esse sprint coloca tudo no ar com
URLs públicas e sem custo (free tiers).

---

## Decisões

### 1. **Vercel** pro `apps/web` (Next.js admin + web pública)

- Free tier: 100 GB bandwidth/mês, builds ilimitados, edge functions.
- Next.js é first-class no Vercel — zero config além do `vercel.json`.
- Build apontando pra raiz do monorepo com `--filter=web`.
- Subdomain default `*.vercel.app` (custom domain só quando barbearia
  pedir).

### 2. **Railway** pro `apps/api` (NestJS + pg-boss worker no mesmo processo)

- Free tier: $5 de crédito/mês. Suficiente pra ~750h de container small.
- pg-boss worker roda no mesmo processo do API (ADR-007 §1) — sem
  segundo serviço.
- Build via **Dockerfile** (não Nixpacks) — controle previsível pra
  monorepo + Prisma generate.
- Healthcheck em `/health` (já existe) configurado no `railway.toml`.

### 3. **Neon** pra Postgres prod (já é stack atual em dev)

- Free tier: 0.5 GB storage, 100h compute/mês. Cabe MVP folgado.
- Branch separada `production` (mantém `main` pra dev).
- `DATABASE_URL` da Neon prod vai como env Railway.

### 4. **Supabase Auth** já é prod desde dev — sem mudança

Projeto Supabase é cloud-first. Mesmo URL/key em dev e prod. Quando
crescer, separar em projeto dedicado pra prod.

### 5. **Resend** prod precisa **domínio verificado**

Em dev usamos `onboarding@resend.dev` (sandbox, só envia pra account
owner). Em prod precisa:
- Comprar domínio (ou usar Vercel's `*.vercel.app` — Resend não aceita)
- Verificar domínio no Resend (DNS records)
- `EMAIL_FROM` vira `agendamento@<dominio>`

Se sem domínio, mantém sandbox e cliente final não recebe email (só dev
recebe). MVP aceita esse trade-off — domínio é Sprint 11+.

### 6. **CORS dinâmico** baseado em `ALLOWED_ORIGINS` env

API hoje aceita origin localhost. Em prod precisa:
- `https://<web>.vercel.app` (admin + landing pública)
- `https://api.barbearia.app` (talvez pra Swagger/docs)
- localhost (manter pra dev sem conflito)

Lista comma-separated em env `ALLOWED_ORIGINS`. Sem env → fallback
permissivo `*` em dev e restritivo em prod (`NODE_ENV=production`).

### 7. **Secrets** rotacionáveis sem redeploy

- `APPOINTMENT_CANCEL_SECRET` → 32+ bytes random
- `RESEND_API_KEY` → da conta Resend
- `DATABASE_URL` → Neon connection string
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` → projeto Supabase
- `SUPABASE_JWT_SECRET` → JWT secret do Supabase (validation)
- `PUBLIC_WEB_URL` → URL Vercel (usado nos cancel links de email)

Todos vão como env vars no Railway/Vercel. Documento step-by-step no
`docs/deploy.md`.

### 8. **CI via GitHub Actions** — lint + typecheck + test pre-merge

Workflow simples:
- `pnpm install --frozen-lockfile`
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm --filter api test`

Roda em PRs pra `main`. Sem deploy automatizado nessa sprint — push
manual via dashboard Vercel/Railway. Quando estabilizar (Sprint 12+),
adiciona deploy automation.

### 9. **Migrations** rodadas manualmente pelo dev na primeira vez

Pra MVP, rodar `prisma migrate deploy` localmente apontando pra Neon
prod (uma vez). Automatizar via Railway pre-deploy hook é Sprint 11+.

### 10. **Mobile customer/business** ficam em **Expo Go** nessa sprint

EAS Build + publish na store fica pra Sprint 11 — depende de:
- Ícones finais
- Splash screen
- App Store Connect + Google Play Console setup
- Privacy policy URL (que exige domínio web)

Web pública cobre o caso de uso de cliente final por enquanto.

---

## Trade-offs aceitos

- **Sem domínio custom** — URLs `*.vercel.app` e `*.railway.app` ficam
  expostas. Comunica menos profissional mas funciona.
- **Sem CDN/cache extra** — Vercel já tem CDN nativo. Sem CloudFlare
  ainda.
- **Sem Sentry/observability** — ADR-002 menciona Sentry free como
  futuro. Sprint 12+ junto com alertas.
- **Sem deploy automatizado** — `git push` não dispara deploy automático.
  Railway tem auto-deploy via git push, mas vou desabilitar e fazer
  manual via dashboard pra controlar quando subir.
- **Mobile sem store** — usuários testam via Expo Go (scan QR). Suficiente
  pra validar conceito; vira EAS quando aparecer demanda.

---

## Roadmap em fases

| Fase | Entrega                                                           |
|------|-------------------------------------------------------------------|
| 1    | ADR-011 + `.env.example` completo (api, web, mobile-customer)     |
| 2    | Vercel config pro apps/web (vercel.json + build script)           |
| 3    | Railway config pro apps/api (Dockerfile + railway.toml + healthcheck) |
| 4    | CORS dinâmico + env defaults pra prod                             |
| 5    | GitHub Actions CI (lint + typecheck + test)                       |
| 6    | docs/deploy.md com checklist passo-a-passo                        |

Cada fase fecha com commit. Push manual quando estiver pronto.
