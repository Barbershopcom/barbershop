# ADR-0001 — Decisões Arquiteturais Fundacionais

- **Data:** 2026-05-23
- **Status:** Aprovado
- **Autor:** jarilson.rk@gmail.com (dev solo)
- **Contexto:** SaaS B2B2C de gestão de barbearias. Modelo híbrido de monetização (mensalidade + fee por transação). Mercado brasileiro (PIX obrigatório). Volume esperado: dezenas a centenas de tenants no primeiro ano.

---

## ADR-001: Distribuição de Apps

**Decisão:** 2 apps mobile (Cliente, Business) + 1 web (Landing + Admin).

- **Cliente:** app B2C focado em conversão.
- **Business:** roles internos (Admin, Barbeiro) com switcher; suporta usuário com múltiplos roles e múltiplos tenants.
- **Web:** landing pública + admin web pro dono que prefere desktop pra relatórios.

**Consequência:** Auth modela `User × Tenant × Role[]` (M:N). Resolve "dono que também corta cabelo" e "barbeiro que trabalha em 2 barbearias" sem refator futuro.

---

## ADR-002: Modelo de Receita

**Decisão:** Mensalidade baixa + fee transacional, ambos pagos pela barbearia (tenant). Cliente final nunca vê fee. Comissão do barbeiro não é tocada pelo fee SaaS.

- Plano "starter R$ 0 fixo + 3% por transação" como hook de aquisição.
- UI da barbearia mostra **net deposit** após fee (sem esconder).
- Cobrar fee SaaS de "pagar na loja" também, em fechamento mensal — senão todo mundo foge do fee.

**Consequência:** Sustentabilidade alinhada com sucesso do tenant. Adoção sem fricção pra cliente final.

---

## ADR-003: Algoritmo de Disponibilidade

**Decisão:** Cálculo sob demanda baseado em **janelas** (não slots pré-computados). Postgres `EXCLUDE USING gist` + `tstzrange` previne double-booking nativamente. Múltiplos serviços = mesmo barbeiro, sequencial, sem gap.

**Modelagem mínima:**
```
Barbershop                    (id, tenant_id, name, ...)
BarbershopHours               (barbershop_id, weekday, opens_at, closes_at)
Service                       (id, tenant_id, name, duration_min, base_price)
Barber                        (id, tenant_id, user_id)
BarberSchedule                (barber_id, weekday, starts_at, ends_at)
BarberServiceCapability       (barber_id, service_id)
Appointment                   (id, tenant_id, barber_id, customer_id,
                               time_range tstzrange, status, total_price,
                               EXCLUDE USING gist (barber_id WITH =,
                                                   time_range WITH &&)
                               WHERE status IN ('confirmed','pending'))
AppointmentService            (appointment_id, service_id, position,
                               duration_snapshot)
```

**Consequência:** Time range é fonte da verdade. Duração snapshot no `AppointmentService` para imutabilidade histórica (mudar duração do catálogo não retroage). Concorrência tratada por exception 409 do constraint, não locking pessimista.

---

## ADR-004: Multi-Tenancy

**Decisão:** Row-level com `tenant_id` em todas as tabelas. Postgres RLS ligado **+** middleware redundante na aplicação (defense in depth).

- Tenant resolvido por **JWT claim** (autenticado) ou **path `/b/[slug]`** (público).
- Cliente final é **entidade global** (`Customer`), pode usar várias barbearias.
- LGPD: endpoint de export e de purge real desde antes do lançamento.

**Consequência:** Toda query passa por repository que injeta `tenant_id`; `SET LOCAL app.tenant_id` em toda transação. Bug de vazamento entre tenants exige falhar em 3 camadas, não 1.

---

## ADR-005: Pagamento

**Decisão:** **Mercado Pago** como único gateway. Dois modos de split:

1. **Split direto** — tenant com conta MP empresarial verificada; valor cai dividido automaticamente.
2. **Repasse manual** — tenant sem MP empresarial; valor cai 100% na conta da plataforma, repassado semanalmente via PIX, descontado o fee.

- Repasse barbearia → barbeiro **fora do sistema** (apenas registro/sugestão, não folha de pagamento).
- "Pagar na loja" confirmado por **barbeiro** no app (não cliente). Status: `confirmed_pay_on_site → completed`.
- Fee SaaS de pay_on_site cobrado mensalmente junto da assinatura.
- Refund PIX é via API MP, janela de 90 dias. Política de cancelamento explícita no checkout.

**Consequência:** `BarberPayout` e `PlatformFeeLedger` como tabelas separadas; ledger é fonte da verdade pro fechamento mensal. Onboarding MP é fricção real — mitigar com modo Repasse desde o MVP.

---

## ADR-006: Stack

**Decisão:**

| Camada | Escolha |
|---|---|
| Mobile | Expo (React Native) + Expo Router + NativeWind |
| Web | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Backend | Hono em Node, hospedado em Fly.io |
| API contract | tRPC + Zod |
| DB | Neon Postgres |
| ORM | Drizzle |
| Auth | Better-auth (multi-tenant nativo) |
| Pagamento | Mercado Pago SDK |
| Push | Expo Notifications |
| Jobs / Queue | BullMQ + Upstash Redis |
| Observabilidade | Sentry + Axiom + PostHog |
| CI/CD | GitHub Actions + EAS |

**Justificativa:** TypeScript end-to-end (zero context switch pra dev solo). Backend separado de Next.js para tolerar long-running tasks (webhooks MP, cron de reconciliação) sem bater limite serverless. Neon dá branching de DB por feature (ambientes grátis). Push em vez de WebSocket no MVP — barbeiro não precisa de tempo real visual.

---

## ADR-007: Monorepo

**Decisão:** Turborepo + pnpm workspaces.

```
/apps
  /web                Next.js (landing + admin)
  /mobile-customer    Expo
  /mobile-business    Expo
  /api                Hono
/packages
  /db                 Drizzle schema + migrations + client factory
  /schemas            Zod (input/output de todos endpoints)
  /api-client         tRPC client + react-query hooks
  /domain             regras de negócio puras (cálculo de slot, comissão, fee)
  /design-tokens      cores, tipografia, espaçamento (compartilhado)
  /eslint-config
  /tsconfig
```

- UI **não compartilhada** entre mobile e web — apenas design tokens.
- `packages/domain` é TypeScript puro, sem React/banco/framework, testável em isolamento.

**Consequência:** Algoritmo de slots vive em `packages/domain` e ambos os apps consomem. Compartilhamento real onde dá ROI, sem astronáutica de design system cross-platform.

---

## ADR-008: Roadmap MVP

**Decisão:** 10 sprints para piloto rodando. Cliente final agenda via **web público** (`/b/[slug]`) no MVP — app cliente nativo só Sprint 8+.

| Sprint | Duração | Entregável |
|---|---|---|
| 0 | 1 sem | Monorepo, CI, Neon, schema, auth, tenant scaffold |
| 1 | 2 sem | Onboarding barbearia (admin web) + CRUD serviços/funcionários |
| 2 | 1 sem | App business mobile: barbeiro login, disponibilidade, capabilities |
| 3 | 2 sem | Web público `/b/[slug]`: agendamento com "pagar na loja" |
| 4 | 1 sem | Push notification ao barbeiro + confirmação manual + cancelamento |
| 5 | 2 sem | Mercado Pago PIX (modo repasse manual primeiro), webhook, reconciliação |
| 6 | 1 sem | Dashboard faturamento admin + comissão barbeiro |
| **MVP** | **10 sem** | **Piloto: 1 barbearia ao vivo** |
| 7 | 2 sem | Split direto MP + onboarding MP do tenant + WhatsApp notif |
| 8 | 3 sem | App cliente nativo (Expo) |
| 9 | 2 sem | Programa fidelidade (se demanda real) + reviews |

**Princípio:** toda sprint tem demo possível pro piloto; cada uma cruza camadas.

---

## ADR-009: Tratamento de Riscos Críticos

Definidos **antes** da primeira linha de código:

- Schema modela `Organization → Location → Barbershop` (mesmo que UI esconda hierarquia no MVP).
- Comissão por `(barber, service?)` desde sprint 1, com defaults configuráveis.
- Política de cancelamento configurável por tenant (janela mínima + cobrança opcional).
- `timestamptz` em **toda** coluna de tempo; `timezone` no tenant (default `America/Sao_Paulo`).
- **Programa de fidelidade NÃO entra no MVP** (feature creep clássico).
- LGPD export/purge endpoints obrigatórios antes do lançamento público.
- API idempotente desde sprint 0 (`Idempotency-Key` header).
- CPF opcional, nunca como ID.
- WhatsApp como canal de notificação no roadmap pós-MVP (Sprint 7+).
- Refund PIX só dentro de 90 dias — termo de uso explícito no checkout.

---

## Decisões deliberadamente adiadas

- App cliente nativo (Sprint 8)
- Programa de fidelidade (Sprint 9+, se demanda real)
- Multi-localização visível na UI (schema já suporta)
- Offline-first no app business
- Tenant switcher visual no app business
- Reviews / ratings
- Notificação WhatsApp
- Cache de slots em Redis (otimizar quando doer)
- Compartilhamento de UI cross-platform (NativeWind + shadcn separados é OK)

---

## Como revisitar este ADR

Crie um novo ADR (`0002-...`, `0003-...`) que **supersede** uma decisão aqui ao invés de editar este arquivo. ADRs são imutáveis após "Aprovado" — o histórico de decisões é tão valioso quanto a decisão atual.
