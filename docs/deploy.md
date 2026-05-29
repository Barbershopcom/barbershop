# Deploy em produção

Guia passo-a-passo pra colocar o Barbearia SaaS no ar pela primeira vez.
Stack: **Vercel** (web) + **Railway** (api) + **Neon** (Postgres) +
**Supabase Auth** + **Resend** (email). Tudo free tier — pronto pra crescer.

ADR de referência: [ADR-011](adr/0011-sprint-10-deploy-producao.md).

---

## 0. Pré-requisitos (5 min)

- Conta no [GitHub](https://github.com) com o repo `barbearia_v2` pushado
- Conta no [Vercel](https://vercel.com) (login com GitHub)
- Conta no [Railway](https://railway.app) (login com GitHub)
- Conta no [Neon](https://neon.tech) (free tier 0.5 GB)
- Conta no [Supabase](https://supabase.com) (já configurada em dev)
- Conta no [Resend](https://resend.com) (3000 emails/mês grátis)

---

## 1. Neon — banco de dados (5 min)

1. Cria novo projeto no [Neon Console](https://console.neon.tech)
2. Nome: `barbearia-prod`
3. Region: **AWS São Paulo** (latência menor pro Brasil)
4. Plan: **Free**
5. Após criar, vai em **Connection Details**:
   - Marca **Pooled connection** → copia → será sua `DATABASE_URL`
   - Desmarca pooled → copia → será sua `DIRECT_URL`
6. Anota ambas. Vão pro Railway depois.

**Exemplo:**
```
DATABASE_URL=postgresql://USER:PASS@HOST-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=10
DIRECT_URL=postgresql://USER:PASS@HOST.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Rodar migrations contra o Neon (3 min, local)

Localmente no seu PC:

```powershell
# Cole as URLs do Neon num arquivo temporário
$env:DATABASE_URL = "postgresql://..."
$env:DIRECT_URL = "postgresql://..."

pnpm --filter @barbearia/api prisma migrate deploy
```

Espera ver:
```
Applying migration `20260524191723_init`
...
Applying migration `20260528203000_customer_devices`
All migrations have been successfully applied.
```

Verifica no Neon Console → **Tables** que `tenants`, `appointments`,
`customer_devices` etc. existem.

---

## 3. Resend — domínio + API key (10 min, opcional pra MVP)

**Opção A: sandbox (zero setup, só você recebe email)**
- Usa `EMAIL_FROM=onboarding@resend.dev`
- Cliente final NÃO recebe email — só você (dono da conta)
- Suficiente pra validar fluxo mas não pra cliente real

**Opção B: domínio próprio (10 min + DNS)**
1. Compra domínio (Registro.br, Namecheap, Cloudflare Registrar...)
2. No Resend Console → **Domains** → **Add Domain**
3. Cola seu domínio (ex: `barbearia.app`)
4. Adiciona registros DNS no provedor (TXT, MX, DKIM — Resend mostra)
5. Aguarda verificação (~minutos)
6. `EMAIL_FROM=agendamento@barbearia.app`

**Em ambos:**
- Em **API Keys** → cria nova key com escopo Send Only
- Anota como `RESEND_API_KEY` (`re_...`)

---

## 4. Railway — deploy do API (10 min)

1. No [Railway Dashboard](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Seleciona `barbearia_v2`
3. Railway detecta o `apps/api/Dockerfile` via `railway.toml`
4. Se não detectar: vai em **Settings**:
   - **Root Directory**: `/` (raiz do repo)
   - **Build → Builder**: `Dockerfile`
   - **Build → Dockerfile Path**: `apps/api/Dockerfile`
5. Em **Variables**, adiciona:

```env
NODE_ENV=production
PORT=3333

# Neon (do passo 1)
DATABASE_URL=postgresql://...?sslmode=require&pgbouncer=true&connect_timeout=10
DIRECT_URL=postgresql://...?sslmode=require

# Supabase Auth (do dashboard Supabase — Project Settings > API)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_JWKS_URL=https://YOUR-PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://YOUR-PROJECT.supabase.co/auth/v1

# CORS — vai preencher depois que Vercel der a URL (passo 5)
CORS_ORIGINS=https://barbearia-web.vercel.app

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev  # ou agendamento@seudominio.app

# URLs públicas
PUBLIC_WEB_URL=https://barbearia-web.vercel.app

# Secret HMAC pros cancel tokens (gera 32+ bytes random)
APPOINTMENT_CANCEL_SECRET=<run: openssl rand -base64 32>
```

**Gerar `APPOINTMENT_CANCEL_SECRET`:**
```powershell
# Windows PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```
Ou em qualquer terminal Unix:
```bash
openssl rand -base64 32
```

6. **Deploy** — aguarda ~3-5 min
7. Em **Settings → Domains** → **Generate Domain** → copia a URL (ex:
   `barbearia-api.up.railway.app`)
8. Teste: abre `https://barbearia-api.up.railway.app/health` no browser →
   deve retornar `{"status":"ok","uptime":...}`

---

## 5. Vercel — deploy do Web (5 min)

1. No [Vercel Dashboard](https://vercel.com/new) → **Import Git Repository**
2. Seleciona `barbearia_v2`
3. Em **Configure Project**:
   - **Framework Preset**: Next.js (auto-detecta)
   - **Root Directory**: `apps/web`
   - **Build & Development Settings**: deixa override OFF (lê do `vercel.json`)
4. Em **Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://barbearia-api.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. **Deploy** — ~2-3 min
6. Copia a URL final (ex: `barbearia-web.vercel.app`)

7. **Volta no Railway** e atualiza:
   - `CORS_ORIGINS=https://barbearia-web.vercel.app`
   - `PUBLIC_WEB_URL=https://barbearia-web.vercel.app`
   - Salva → Railway redeploy automático

---

## 6. Supabase — Site URL + Redirect URLs (3 min)

No [Supabase Dashboard](https://app.supabase.com) → seu projeto:

1. **Authentication → URL Configuration**:
   - **Site URL**: `https://barbearia-web.vercel.app`
   - **Redirect URLs**: adiciona `https://barbearia-web.vercel.app/**`
2. Em **Authentication → Providers → Email**: confirma que **Confirm email**
   está como você quer (sem confirmação pra MVP).

---

## 7. Smoke test ponta-a-ponta (10 min)

1. Abre `https://barbearia-web.vercel.app/login`
2. Login com user de teste → admin dashboard carrega
3. `/admin/agenda` → calendário FullCalendar renderiza
4. Abre `https://barbearia-web.vercel.app/b/<seu-slug>` (rota pública)
5. Reserva um horário com email real
6. Confere inbox: email vintage de confirmação chega
7. Click no link cancelar do email → tela `/cancel/<token>` → confirma →
   email de cancelamento chega

**Se algum passo falhar:**
- API quebrando? Railway → **Deployments** → clica no deploy → **View Logs**
- Web quebrando? Vercel → **Deployments** → **View Function Logs**
- Email não chegando? Resend → **Logs** mostra status (delivered/bounced/skipped)

---

## 8. Mobile (Expo Go, opcional)

EAS Build fica pra Sprint 11+. Por enquanto, dev/QA via Expo Go:

```powershell
# Edita .env do mobile pra apontar pra prod
# apps/mobile-customer/.env e apps/mobile-business/.env
EXPO_PUBLIC_API_URL=https://barbearia-api.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

pnpm --filter mobile-customer dev   # ou mobile-business
```

Escaneia QR no iPhone/Android. App roda em Expo Go falando com API prod.

---

## 9. Checklist final

- [ ] Neon prod com migrations aplicadas
- [ ] Railway API rodando, `/health` retornando OK
- [ ] Vercel Web rodando, login funcionando
- [ ] CORS_ORIGINS do Railway aponta pra URL Vercel
- [ ] PUBLIC_WEB_URL aponta pra Vercel
- [ ] APPOINTMENT_CANCEL_SECRET é random (não o default dev)
- [ ] Resend configurado (sandbox ou domínio próprio)
- [ ] Supabase Site URL aponta pra Vercel
- [ ] Smoke test passou (reserva + email + cancel)

---

## Custos esperados (free tier)

| Serviço | Custo |
|---|---|
| Vercel Hobby | $0 (100 GB bandwidth) |
| Railway | $5 crédito/mês → ~750h container small |
| Neon Free | $0 (0.5 GB storage + 100h compute/mês) |
| Supabase Free | $0 (50k MAU) |
| Resend | $0 (3000/mês) |
| **Total** | **$0/mês** até barbearia ter ~50-100 cliente/dia |

Quando crescer: Railway sobe pra $5-10/mês fixo, Neon Pro $19/mês, Vercel
Pro $20/mês. Total ainda < R$ 250/mês com volumes interessantes.

---

## Próximos passos (pós-deploy)

- **Domínio custom** — comprar `barbearia.app` (~R$50/ano), apontar Vercel
- **Sentry** — observability free tier pra catching erros prod
- **EAS Build** — mobile na App Store + Play Store (Sprint 11+)
- **Tenant Profile** — phone, address, social no Tenant + landing/email
- **Backup automation** — Neon free tem snapshots manuais; automatizar
