# Barbearia v2

SaaS B2B2C de gestão de barbearias. Stack vigente: ver [docs/adr/0002-revisao-stack-backend-auth.md](docs/adr/0002-revisao-stack-backend-auth.md).

## Estrutura

```
apps/
  api/                NestJS + Prisma + Supabase Auth (Railway)
  web/                Next.js 15 + Tailwind + shadcn (Vercel)
  mobile-business/    Expo + NativeWind — admin + barbeiro
  mobile-customer/    Expo + NativeWind — cliente final
packages/
  tsconfig/           configs base de TS
  eslint-config/      configs compartilhadas de ESLint (flat config v9)
  schemas/            Zod schemas compartilhados
  api-client/         wrapper fetch tipado + tipos gerados via OpenAPI
  domain/             regras de negócio puras (slots, fee, comissão)
docs/adr/             Architecture Decision Records
```

## Requisitos

- **Node 20+** (verifique com `node --version`)
- **pnpm 10+** (`corepack enable && corepack prepare pnpm@10.14.0 --activate`)
- Contas externas (gratuitas no MVP): GitHub, Neon, Supabase, Railway, Vercel, Expo

## Scripts (raiz)

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe todos os apps em paralelo (turbo) |
| `pnpm build` | Build de tudo |
| `pnpm lint` | Lint em todos os pacotes |
| `pnpm typecheck` | TS typecheck em todos os pacotes |
| `pnpm test` | Roda testes (sem testes ainda) |
| `pnpm format` | Prettier em todos os arquivos |

---

## Setup — primeira vez

### 1. Instalar deps

```sh
pnpm install
```

### 2. Configurar Neon (DB)

✅ Projeto `barbearia-v2` já existe (region `sa-east-1`, PG 17). A connection string está em `apps/api/.env` (gitignored). Se precisar recriar:

- Acesse https://console.neon.tech
- Project `barbearia-v2` → Dashboard → Connection string
- Cole em `apps/api/.env` como `DATABASE_URL` (pooler) e `DIRECT_URL` (sem `-pooler`)

### 3. Configurar Supabase Auth

1. Acesse https://supabase.com/dashboard → **New project**
   - Name: `barbearia-v2`
   - Region: `South America (São Paulo)`
   - Database password: anote (não usaremos o DB do Supabase — só Auth)
2. Em **Project Settings → API**, copie:
   - `Project URL` → vai em `NEXT_PUBLIC_SUPABASE_URL` (web), `EXPO_PUBLIC_SUPABASE_URL` (mobile), `SUPABASE_URL` (api)
   - `anon public` key → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web), `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile)
3. Preencha em cada `.env`:

   **`apps/api/.env`**
   ```
   SUPABASE_URL=https://SEU-PROJETO.supabase.co
   SUPABASE_JWKS_URL=https://SEU-PROJETO.supabase.co/auth/v1/.well-known/jwks.json
   SUPABASE_JWT_ISSUER=https://SEU-PROJETO.supabase.co/auth/v1
   ```

   **`apps/web/.env.local`**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

   **`apps/mobile-business/.env`** e **`apps/mobile-customer/.env`**
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Em **Authentication → Providers** habilite Email (default) e configure Google OAuth quando quiser (opcional pro MVP).

### 4. Aplicar schema do Prisma no Neon

```sh
pnpm --filter @barbearia/api prisma:generate
pnpm --filter @barbearia/api prisma migrate dev --name init
```

Cria as tabelas `app_users` e `tenants` em Neon.

### 5. Subir tudo localmente

```sh
pnpm dev
```

Acesse:
- API: http://localhost:3333 (Swagger em `/docs`)
- Web: http://localhost:3000
- Mobile business: Expo Go via QR code (porta 8081)
- Mobile customer: rodar em terminal separado (`pnpm --filter @barbearia/mobile-customer dev`)

### 6. Smoke test do auth

1. No Supabase Dashboard → Authentication → Users → criar usuário manualmente (email+senha).
2. No web em http://localhost:3000/login, logue com esse usuário.
3. Abra DevTools → Network → veja a sessão salva.
4. `curl http://localhost:3333/me -H "Authorization: Bearer SEU_JWT"` deve retornar `{id, email, ...}`.

---

## Deploy

### Railway (API)

- New project → Deploy from GitHub repo
- Root: `apps/api`
- Build: detectado via `Dockerfile`
- Env vars: copiar de `apps/api/.env` (substituir Neon pooler URL pela prod URL)
- Generate domain → adicione a URL em `CORS_ORIGINS` do próprio service

### Vercel (Web)

- Import project → root `apps/web`
- Build command: `cd ../.. && pnpm --filter @barbearia/web build`
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Env vars: copiar de `apps/web/.env.local` (substituir API URL pela do Railway)

### EAS (Mobile)

```sh
pnpm dlx eas-cli login
cd apps/mobile-business && pnpm dlx eas-cli build:configure
cd apps/mobile-customer && pnpm dlx eas-cli build:configure
```

---

## CI

Workflow em `.github/workflows/ci.yml` roda em todo push/PR pra `main`:
- `pnpm install --frozen-lockfile`
- `pnpm --filter @barbearia/api prisma:generate`
- `pnpm typecheck`
- `pnpm lint`

## Edição de schemas

`packages/schemas` é compilado pra `dist/` via `tsc` — apps consomem o
`.js` resultante, não o `.ts` direto. Quando você edita um schema:

```sh
# uma vez:
pnpm --filter @barbearia/schemas build

# ou, em dev contínuo (terminal separado, recomendado):
pnpm --filter @barbearia/schemas dev
```

O modo `dev` (`tsc --watch`) recompila a cada save. API (`nest start --watch`)
e Next dev/Expo Metro pegam a versão nova automaticamente.

Em CI, `turbo run typecheck` resolve a ordem via `dependsOn: ['^build']`.

## Edição de migrations Prisma

```sh
# Criar migration nova (modificou schema.prisma)
pnpm --filter @barbearia/api prisma migrate dev --name nome_descritivo

# Criar migration vazia pra editar SQL manualmente (RLS policies, roles)
pnpm --filter @barbearia/api prisma migrate dev --name nome --create-only

# Aplicar migrations pendentes
pnpm --filter @barbearia/api prisma migrate dev
```

**Nunca edita uma migration já aplicada** — cria uma nova. ADR-001 #4.

## Troubleshooting

- **`Cannot find module '@barbearia/...'`** — rodar `pnpm install` na raiz +
  `pnpm --filter @barbearia/schemas build` (schemas compilam pra `dist/`).
- **API retorna 401 mesmo com JWT** — `SUPABASE_JWKS_URL`/`SUPABASE_JWT_ISSUER`
  desconfigurados; veja logs de boot. Ou JWT assinado com algoritmo diferente
  (Supabase moderno usa ES256, antigo RS256 — `jwt.strategy.ts` aceita ambos).
- **Expo não encontra IP do backend** — em vez de `localhost`, use o IP da
  máquina (`ipconfig` no Windows) em `EXPO_PUBLIC_API_URL`.
- **NativeWind classes sem efeito** — confirme que `global.css` foi importado
  em `app/_layout.tsx`.
- **`Expo CLI fetch failed` ao subir mobile** — Expo tenta validar versões
  contra expo.dev no startup. Se firewall/VPN bloqueia, defina
  `$env:EXPO_OFFLINE="1"` antes de `pnpm dev`.
- **Prisma `P2028 Transaction not found`** — timeout do `$transaction` do
  TenantInterceptor (default 5s, bumped pra 30s). Se persistir, considere
  trocar `DATABASE_URL` pelo endpoint direct (sem pgbouncer).
