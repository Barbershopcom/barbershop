# Observability via Sentry

Setup completo do Sentry pros 4 projetos (api, web, mobile-customer,
mobile-business) e alertas recomendados. ADR de referência:
[ADR-014](adr/0014-sprint-13-observability-sentry.md).

---

## 0. Pré-requisitos

- Conta no [Sentry](https://sentry.io) — free tier (5k errors/mês,
  10k transactions/mês). Login com GitHub.

---

## 1. Criar projetos no Sentry (5 min)

No [Sentry Dashboard](https://sentry.io) → **Create Project**, repete 4x:

| Project name              | Platform         | DSN env var                    |
|---------------------------|------------------|--------------------------------|
| `barbearia-api`           | Node.js (NestJS) | `SENTRY_DSN`                   |
| `barbearia-web`           | Next.js          | `NEXT_PUBLIC_SENTRY_DSN`       |
| `barbearia-mobile-customer` | React Native   | `EXPO_PUBLIC_SENTRY_DSN`       |
| `barbearia-mobile-business` | React Native   | `EXPO_PUBLIC_SENTRY_DSN`       |

Após criar, copia o DSN de cada projeto (Settings → Client Keys).

---

## 2. Configurar env vars

### Railway (apps/api)

Adiciona env var:

```env
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYY
DEBUG_SENTRY=false  # true só pra testar /debug-sentry endpoint
```

Railway automaticamente injeta `RAILWAY_GIT_COMMIT_SHA` que o
`src/instrument.ts` usa pra release tag.

### Vercel (apps/web)

Em Settings → Environment Variables:

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/ZZZ
SENTRY_AUTH_TOKEN=sntrys_xxx  # User Settings → Auth Tokens → Create
SENTRY_ORG=barbearia-org  # encontra em Sentry settings URL
SENTRY_PROJECT=barbearia-web
NEXT_PUBLIC_DEBUG_SENTRY=false  # true só pra /debug-sentry
```

Vercel injeta `VERCEL_GIT_COMMIT_SHA` automaticamente — vira release tag.

### Mobile (eas.json)

Adiciona em cada profile (preview + production):

```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://barbearia-api.up.railway.app",
  "EXPO_PUBLIC_SENTRY_DSN": "https://xxx@oXXX.ingest.sentry.io/AAA"
}
```

Rebuild com `eas build --profile preview --platform android` pra
incorporar DSN no bundle.

---

## 3. Testar (3 min cada)

### API

```powershell
# Local com DSN configurado:
$env:SENTRY_DSN = "https://..."
$env:DEBUG_SENTRY = "true"
pnpm --filter api dev

# Em outro terminal:
curl http://localhost:3333/debug-sentry
# Status 500 esperado — verifica dashboard Sentry "barbearia-api"
```

Em prod (Railway): bate em `https://barbearia-api.up.railway.app/debug-sentry`
com `DEBUG_SENTRY=true` setado. Após confirmar, **desativa**.

### Web

```powershell
# Local:
$env:NEXT_PUBLIC_SENTRY_DSN = "https://..."
$env:NEXT_PUBLIC_DEBUG_SENTRY = "true"
pnpm --filter web dev

# Browser: http://localhost:3000/debug-sentry
# Clica os 2 botões — confere dashboard "barbearia-web"
```

### Mobile

```powershell
# Edita .env do app:
EXPO_PUBLIC_SENTRY_DSN=https://...

# Adiciona no app/_layout.tsx temporariamente:
# useEffect(() => { throw new Error('Sentry mobile test'); }, []);

pnpm --filter mobile-customer dev
```

Após confirmar dashboard, remove o useEffect.

---

## 4. Alertas recomendados

No dashboard de cada projeto → **Alerts → Create Alert Rule**:

### A. Spike de erros (todos os projetos)

- **Condition**: Number of errors **> 10** in **1 hour**
- **Filters**: `level: error`, `environment: production`
- **Action**: Email pra `jarilson.rk@gmail.com`

Pega problemas em massa (deploy bug, DB down).

### B. Erro novo (todos os projetos)

- **Condition**: A new issue is created
- **Filters**: `environment: production`
- **Action**: Email

Catch regressions cedo. Pode ser barulhento — vira "weekly digest"
se for muito.

### C. Performance regression (API + Web)

- **Condition**: `transaction.duration` p95 > **2000ms** em **5 minutos**
- **Filters**: `environment: production`
- **Action**: Email

Limites podem ser ajustados depois de coletar baseline (1-2 semanas
de dados).

---

## 5. Custos esperados (free tier)

| Projeto | Quota usada (estimativa MVP) |
|---|---|
| 4 projetos | $0 (free) |
| Errors total | 4 × ~500 = 2k/mês (sobra dentro de 5k) |
| Transactions | 4 × ~2k = 8k/mês (limite 10k) |
| Replays | $0 (desabilitado) |
| **Total** | **$0/mês** até 5k errors |

Upgrade pra Team ($26/mês) quando atingir limite. Sample rate diminui
custo: troca `tracesSampleRate` de `0.1` pra `0.05` se necessário.

---

## 6. LGPD considerations

`beforeSend` em todos os clients scrubba:
- `customerEmail`, `customerPhone`, `customerName`
- `password`
- `authorization` e `cookie` headers

Sentry default já scrubba CC numbers, SSN, etc. (PII Stripping default).

Pra dúvida específica do legal time, ative **Server-Side Data Scrubbing**
no dashboard (Settings → Security & Privacy) com regex extras.

**Privacy policy** precisa mencionar:
> "Usamos Sentry pra coletar erros técnicos. Dados pessoais (nome,
> email, telefone) são removidos antes do envio."

---

## 7. Próximos passos (Sprint 14+)

- **Session Replay** (LGPD review primeiro)
- **Source maps em prod** (já tá configurado no Vercel — só precisa
  do SENTRY_AUTH_TOKEN setado)
- **Custom dashboards** (Sentry Discover) pra business metrics
- **Cron monitoring** pra jobs do pg-boss (Sentry Cron Monitors)
- **Slack integration** pra alertas em tempo real
- **Release health tracking** com automatic deployment notifications
