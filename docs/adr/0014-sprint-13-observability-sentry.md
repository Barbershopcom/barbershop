# ADR-014: Sprint 13 — Observability via Sentry

- **Data:** 2026-05-29
- **Status:** Aprovado
- **Supersedes:** nada
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 10 (ADR-011) colocou tudo em prod mas explicitamente pulou
observability — "Sem Sentry/observability — ADR-002 menciona Sentry
free tier como futuro. Sprint 12+ junto com alertas." Agora é o momento.

Produto vivo em prod (web), com mobile pronto pra distribuir (EAS Build
configurado em Sprint 12). Sem catching de erros centralizado:
- Stack traces em logs Railway são efêmeros (rotaciona)
- Frontend errors invisíveis (browser console só)
- Mobile crashes só aparecem se user reporta
- Performance bottlenecks sem visibilidade

Sentry free tier (5k events/mês, 10k transactions/mês) cobre MVP folgado.

---

## Decisões

### 1. **Sentry** — não alternativas open source

Trade-off considerado:
- Sentry self-hosted: setup pesado, infra extra
- BetterStack / Highlight: caros, menos features
- Logtail / Datadog: caros, complexos

Sentry SaaS free tier vale a pena. Trocamos quando free não der.

### 2. **Um projeto Sentry por aplicação** — 4 projetos

- `barbearia-api` (NestJS)
- `barbearia-web` (Next.js)
- `barbearia-mobile-customer` (Expo)
- `barbearia-mobile-business` (Expo)

Cada projeto tem seu DSN próprio. Releases linkadas (mesma versão semver
em todos via app.json/package.json).

### 3. **`@sentry/nestjs`** pra apps/api (NestJS 11)

Pacote oficial. Tem interceptor que captura exceptions de todos os
controllers + filters globais.

Init no `main.ts` ANTES do `NestFactory.create`:
```ts
import * as Sentry from '@sentry/nestjs';
Sentry.init({ dsn: process.env.SENTRY_DSN, ... });
```

### 4. **`@sentry/nextjs`** pra apps/web

Pacote oficial com instrumentação automática:
- Browser errors
- SSR errors
- Edge runtime
- Source maps upload em build

`SENTRY_AUTH_TOKEN` no Vercel env pra source maps.

### 5. **`@sentry/react-native`** + `sentry-expo` pra mobile

Expo SDK 54 suporta `@sentry/react-native@^7` direto. Config no
`app.json` via plugin.

Native crashes (iOS/Android) + JS errors capturados.

### 6. **Scrub PII por default**

`beforeSend` hook que remove campos sensíveis:
- `customerEmail`, `customerPhone`, `customerName`
- JWT tokens em headers
- Senhas

LGPD-friendly. Por padrão Sentry já scrubba alguns (passwords), mas
`customerEmail` e telefone NÃO — temos que filtrar manualmente.

### 7. **Sample rate** — 100% errors, 10% transactions

Free tier free dá 5k events/mês. 100% errors é OK porque MVP tem volume
baixo. Performance traces (transactions) limita a 10% pra não estourar
quota.

```ts
{
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,  // sessions reduzem quota — só erros
  replaysOnErrorSampleRate: 0,
}
```

Session Replay desabilitado por enquanto (LGPD + custo de quota).

### 8. **Environment tag** = NODE_ENV

`environment: process.env.NODE_ENV` separa dev / production no dashboard.
Filtros default ignoram development.

### 9. **Release tracking** via semver

`release: \`barbearia-api@\${version}\`` etc. Permite ver quais bugs
vieram em qual release. Vercel já tem deploy hash; Railway expõe via env.

### 10. **Alertas** — só os essenciais no MVP

Configuração via dashboard Sentry (não via código). 3 alertas iniciais:
- Spike de erros (>10/hora) em qualquer projeto → email
- Erro novo (first seen) em production → email
- Performance regression (p95 latency >2x baseline) → email

Slack/PagerDuty pra Sprint 14+.

---

## Trade-offs aceitos

- **Sem Session Replay** — perde contexto visual de bug. Reativa em
  Sprint 14+ se erros forem difíceis de repro.
- **10% trace sampling** — não captura todas requests pra performance.
  Suficiente pra trends; erros sempre 100%.
- **Sentry SaaS** — dependência externa. Free tier cobre MVP; quando
  crescer, avalia self-hosted.
- **Source maps no Vercel** — exige `SENTRY_AUTH_TOKEN` em env. Sem
  isso, errors do client vêm minified (ainda legíveis pelo dsn).

---

## Roadmap em fases

| Fase | Entrega                                                                    |
|------|----------------------------------------------------------------------------|
| 1    | ADR + `@sentry/nestjs` em apps/api + init em main.ts + scrub PII           |
| 2    | `@sentry/nextjs` em apps/web (client + server + source maps)               |
| 3    | `@sentry/react-native` nos 2 mobile + plugin no app.json                   |
| 4    | Test endpoint `/debug-sentry` + scrub config compartilhado + release tags  |
| 5    | `docs/observability.md` com setup + alertas recomendados + DSN config       |

Cada fase fecha com commit.
