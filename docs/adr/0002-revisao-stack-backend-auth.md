# ADR-002: Revisão de Stack (Backend, Auth, Jobs, API)

- **Data:** 2026-05-24
- **Status:** Aprovado
- **Supersedes:** parcialmente ADR-001 (auth), ADR-006 (stack), ADR-008 (sprint auth)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto que motivou a revisão

A primeira rodada do council recomendou Hono em Fly.io + tRPC + Better-auth sem ter conhecimento de:

- Experiência prévia do dev em NestJS, Next.js, Supabase Auth
- Construção anterior de SaaS de barbearia V1 em NestJS + Prisma + Mercado Pago
- Constraint de tempo (dev solo com freelances simultâneos)
- Volume real esperado (5-20 tenants no primeiro ano)
- Necessidade real de backend (webhook + cron + queue leve, NÃO long-running)

A segunda rodada recalibrou com esse contexto e a recomendação mudou.

---

## Princípio guia desta revisão

> "Use a stack que você já domina, exceto onde há ganho objetivo claro."

Tempo é o recurso mais escasso. Cada semana aprendendo framework novo é uma sprint sem feature entregue.

---

## Decisões revisadas

### Backend

- **De:** Hono em Fly.io + tRPC
- **Para:** NestJS em Railway + REST + OpenAPI (Swagger)
- **Por quê:** dev domina NestJS, Railway é git push deploy, volume MVP cabe folgado, delta de aprendizado zero.

### ORM/DB

- **De:** Drizzle + Neon
- **Para:** Prisma + Neon
- **Por quê:** dev já usou Prisma no V1, RLS via interceptor customizado é padrão conhecido. Drizzle pode ser reavaliado em 12 meses.

### Auth

- **De:** Better-auth com plugin de organizations
- **Para:** Supabase Auth standalone + Neon como DB principal
- **Por quê:** dev já conhece Supabase Auth, edge cases (refresh token, rate limiting, password hashing) resolvidos. JWT validado no NestJS via JWKS. Multi-tenancy modelada no Neon.

### API style

- **De:** tRPC
- **Para:** REST + Swagger/OpenAPI + openapi-typescript codegen
- **Por quê:** tRPC ROI marginal pra 10-20 endpoints com 1 dev. REST oferece cacheabilidade, debugging com Postman, openapi-typescript dá tipos no cliente sem amarrar runtime.

### Validação

- class-validator no backend NestJS (nativo, já domina)
- Zod nos packages compartilhados (mobile/web)
- Tipos TS gerados via OpenAPI consumidos por ambos

### Jobs/Cron/Queue

- **De:** BullMQ + Upstash Redis
- **Para:** pg-boss dentro do NestJS
- **Por quê:** zero infra extra, usa Postgres que já existe, resolve cron + queue + retry + dead-letter num único pacote. Separar worker do API process apenas quando latência impactar.

### SMS provider (Supabase Auth)

- MessageBird no MVP (~$0.04/msg, ~$30/mês a 1000 OTPs)
- Migrar pra Zenvia via webhook customizado quando passar de 2k OTPs/mês
- Rate limit no envio pra evitar abuso

---

## Stack final consolidada

| Camada | Escolha | Custo |
|---|---|---|
| Backend | NestJS em Railway | $5-20/mês |
| DB | Neon Postgres + Prisma | $0 → $19 (Pro) |
| Auth | Supabase Auth standalone | $0 (50k MAU) |
| SMS | MessageBird via Supabase | ~$30/mês |
| Web | Next.js 15 em Vercel | $0 → $20 (Pro) |
| Mobile | Expo + Expo Router + NativeWind | $99/ano Apple + $25 Google (one-time) |
| Validação | class-validator (back) + Zod (front) | $0 |
| API | REST + Swagger + openapi-typescript | $0 |
| Jobs | pg-boss no NestJS | $0 |
| Push | Expo Notifications | $0 |
| Pagamento | Mercado Pago SDK | fee por transação |
| Erros | Sentry | $0 (free) |
| Logs | Railway built-in | incluído |
| Analytics | PostHog | $0 (free) |
| CI/CD | GitHub Actions + EAS | $0 |
| Monorepo | Turborepo + pnpm workspaces | $0 |

**Custo total MVP estimado: $35-90/mês + $99/ano Apple Developer**

---

## Arquitetura de auth (referência)

```
[Mobile Expo / Web Next.js]
        ↓ (Supabase JS SDK)
[Supabase Auth] — emite JWT assinado
        ↓ (Authorization: Bearer <jwt>)
[NestJS API em Railway]
  ├─ AuthGuard: valida JWT via JWKS (passport-jwt + jwks-rsa)
  ├─ TenantInterceptor: busca tenant_memberships(user_id) em Neon,
  │    seta app.user_id + app.tenant_id na transação Prisma
  └─ Controllers acessam Prisma → RLS Postgres funciona
```

---

## Schema mínimo de identidade no Neon

```sql
CREATE TABLE app_users (
  id uuid PRIMARY KEY,         -- = supabase auth.users.id
  display_name text,
  cpf text,
  phone_e164 text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tenant_memberships (
  user_id uuid REFERENCES app_users(id),
  tenant_id uuid REFERENCES tenants(id),
  roles text[] NOT NULL,
  PRIMARY KEY (user_id, tenant_id)
);

-- Webhook Supabase Auth → criar app_users automaticamente no signup
```

---

## Quando reavaliar essas decisões

| Decisão | Trigger para reavaliação |
|---|---|
| NestJS → Hono | 50+ tenants pagantes + latência ou custo virou gargalo real |
| Prisma → Drizzle | RLS doendo + receita pagando o refactor |
| Supabase Auth → custom | $200+/mês de SMS ou compliance on-prem exigir |
| pg-boss → BullMQ | Worker impactando latência da API |
| MessageBird → Zenvia | 2k+ OTPs/mês |
| REST → tRPC | 50+ endpoints + time crescer |
| Railway → Fly.io | Multi-região necessária ou cold start importar |

---

## Roadmap MVP ajustado (10 sprints)

**Sprint 0 (1 sem)** — Monorepo (Turborepo+pnpm), Railway+NestJS bootstrap, Neon+Prisma, Supabase Auth setup, GitHub Actions CI

**Sprint 1 (2 sem)** — Multi-tenancy schema (Organization→Location→Barbershop), TenantInterceptor, RLS policies, app_users sync via webhook, Admin web: onboarding + CRUD serviços/funcionários

**Sprint 2 (1 sem)** — App business mobile (Expo): login, perfil barbeiro, disponibilidade, capabilities de serviço

**Sprint 3 (2 sem)** — Web público `/b/[slug]`: catálogo, escolha barbeiro, algoritmo de slots, agendar com "pagar na loja"

**Sprint 4 (1 sem)** — Push notification (Expo) no agendamento, confirmação/recusa pelo barbeiro, política de cancelamento

**Sprint 5 (2 sem)** — Mercado Pago PIX + cartão, webhook idempotente, PlatformFeeLedger, repasse manual

**Sprint 6 (1 sem)** — Dashboard faturamento admin + comissão barbeiro

**= MVP (10 sem): 1 barbearia piloto em produção**

**Sprint 7+ (pós-MVP):** Split MP direto, app cliente nativo, WhatsApp notification, fidelidade, reviews.

---

## Decisões inalteradas do ADR-001

- ADR-001 distribuição de apps (Cliente nativo + Business com roles + Web)
- ADR-002 modelo de receita (mensalidade + fee na barbearia)
- ADR-003 algoritmo de disponibilidade (janelas + Postgres EXCLUDE)
- ADR-004 multi-tenancy (row-level + RLS + middleware)
- ADR-005 pagamento (Mercado Pago, split direto + repasse manual)
- ADR-007 monorepo Turborepo (estrutura mantida)
- ADR-009 tratamento de riscos críticos
