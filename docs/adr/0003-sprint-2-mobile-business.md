# ADR-003: Sprint 2 — App business mobile (decisões arquiteturais)

- **Data:** 2026-05-25
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-002 com decisões específicas do mobile)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 2 entrega o **app business mobile** (admin + barbeiro): login, perfil,
capabilities de serviço, schedule pessoal. Council aberto em 2026-05-25 para
fixar 7 decisões que travariam padrão pro resto do mobile se ficassem pra
depois.

Princípio guia (continuando ADR-002): **usar o que já está validado, adicionar
complexidade só com gatilho concreto.**

---

## Decisões

### 1. Data fetching

**`fetch` puro + hooks (`useEffect`, `useState`).** Mesmo padrão do web.

- Sprint 2 tem 4 telas mobile. Boilerplate de loading/error/refresh é absorvível.
- TanStack Query (react-query) entra **quando os dois apps** tiverem listas
  paginadas, optimistic mutations, ou cache cross-screen — não preventivamente.

### 2. Modelo de Schedule do barbeiro

Tabela `BarberSchedule(barber_id, weekday, opens_at, closes_at, created_at)`,
PK gerada, múltiplas linhas/dia (cobre intervalo manhã/tarde). Espelha
`BarbershopHours`.

- `BarberTimeOff(barber_id, start_date, end_date, reason)` fica **deferido**
  pra Sprint 5+ (quando primeiro barbeiro reclamar de não conseguir marcar
  férias).
- Algoritmo de slots (Sprint 3): `intersect(BarbershopHours, BarberSchedule) -
  appointments` (referência ADR-003 do ADR-001 / ADR-002).

### 3. Capabilities de serviço

M:N pura: `BarberServiceCapability(barber_id, service_id)`, PK composta, sem
campos extras.

- Per-barber price/duration override **deferido**. Quando aparecer (Sprint 6+),
  adiciona colunas nullable `price_cents_override`, `duration_min_override` na
  própria tabela — schema-compatible.
- Endpoint GET sempre filtra `service.is_active = true` (capabilities órfãs em
  serviços desativados ficam invisíveis até admin reativar).

### 4. Linking `Employee` ↔ `AppUser`

**Email auto-link no MVP.** Primeiro login mobile do barbeiro:
1. Backend extrai email do JWT
2. Procura `employees.email = jwt.email AND app_user_id IS NULL`
3. Se achar: linka (`app_user_id = jwt.sub`) + cria/atualiza
   `tenant_membership` com roles derivados do `employee.role`
4. Se não achar: retorna 403 "Você não está cadastrado em nenhuma barbearia.
   Peça pro admin te cadastrar com este email."

**Invite token explícito** (admin gera link → barbeiro clica) entra **no Sprint
7+** quando entrar em produção paga.

### 5. Permission state (`employee.role` vs `tenant_membership.roles`)

**`employee.role` é a fonte da verdade. `tenant_memberships.roles` é
derivado.**

Mapeamento:

| `employee.role` | `tenant_memberships.roles` |
|---|---|
| `'barber'` | `['barber']` |
| `'admin'` | `['admin']` |
| `'admin_barber'` | `['admin', 'barber']` |

- Web admin edita apenas `employee.role`. Backend sincroniza membership na
  mesma transação Prisma.
- Single source of truth, sem divergência possível.
- Implementação **na aplicação** (não em trigger SQL) — mais visível em
  code review.

### 6. Email typo handling

Sugestão (não auto-correção silenciosa) via **`mailcheck.js`** (lib madura,
distância de Levenshtein contra dicionário de domínios comuns).

- Em todo input de email (web admin: cadastro de funcionário; mobile: tela
  de auto-link), mostrar "Você quis dizer `joao@gmail.com`?" com botões
  Sim/Não.
- Domínios brasileiros no dicionário: gmail, hotmail, yahoo, outlook,
  icloud, uol, terra, bol, live.
- Nunca corrige sem confirmar — evita "eu digitei X mas virou Y".

### 7. Rede flaky (alternativa a offline-first)

**Meio termo**: offline-first **deferido pro Sprint 8** (council novo quando
começar app cliente nativo). Sprint 2 entrega 3 mitigações baratas:

1. **Indicador visível de offline** — banner amarelo persistente no topo
   quando `navigator.onLine === false` (RN: `NetInfo`).
2. **Idempotency-Key header em toda mutation** — UUID gerado client-side,
   backend deduplica via tabela `webhook_events` ou cache de keys. Foundational
   pra retry seguro hoje e offline futuro.
3. **Retry visível** — quando request falha, toast "Não foi possível salvar.
   Tentar novamente?" com botão. Nunca silencia erro.

**Por que não offline-first agora:** Sprint 2 = app business. Barbeiro
trabalha dentro da barbearia com WiFi+4G. Custo de implementar sync engine
(cache local, fila de mutations, conflict resolution, idempotency completa)
não justifica pro usuário desse app. Reavaliar no Sprint 8 (customer app)
onde offline tem demanda real.

### 8. Secrets em mobile storage (tech debt)

Supabase JS client guarda session em `AsyncStorage` por default. **No MVP
isso fica.** Anotado como tech debt pós-MVP:

- iOS: migrar pra Keychain via `expo-secure-store`
- Android: Keystore via mesma lib
- Trigger pra fazer: entrar em produção paga + ter PII sensível (CPF cliente,
  histórico pagamento).

### 9. Expo Go preflight

**Toda nova dep nativa que cogitarmos adicionar passa por check antes:**

- Listada em https://docs.expo.dev/develop/development-builds/use-expo-go/ ?
- Se sim: ok, Expo Go roda.
- Se não: precisa de development build (EAS Build dev client). Não bloqueia
  mas exige decisão consciente — não descobrir na hora.

Documentar a dep escolhida em comentário no `package.json` quando adicionar.

### 10. Mobile + schemas rebuild

`@barbearia/schemas` compila pra `dist/` via `tsc`. Quando você edita um
schema, mobile (Metro) e API (Nest watch) precisam recompilar.

- Em dev: rodar `pnpm --filter @barbearia/schemas dev` em terminal separado
  (`tsc --watch`) — assim mobile/web/api pegam mudança automática.
- Em CI: turbo cuida via `dependsOn: ['^build']`.
- Documentado no README seção "Edição de schemas".

---

## Schema additions Sprint 2

Migration `add_barber_schedule_and_capabilities`:

```sql
CREATE TABLE barber_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  barber_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  weekday       INT  NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at      TEXT NOT NULL,
  closes_at     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX barber_schedules_tenant_idx ON barber_schedules(tenant_id);
CREATE INDEX barber_schedules_barber_weekday_idx ON barber_schedules(barber_id, weekday);

CREATE TABLE barber_service_capabilities (
  tenant_id  UUID NOT NULL,
  barber_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);
CREATE INDEX barber_service_capabilities_tenant_idx ON barber_service_capabilities(tenant_id);
CREATE INDEX barber_service_capabilities_service_idx ON barber_service_capabilities(service_id);
```

RLS policies seguem o padrão tenant-scoped do ADR-002 (`tenant_id =
current_setting('app.tenant_id')`).

---

## Plano de execução (5 fases vertical slice)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 1-2 dias | Login mobile + auto-link via email + tela "Início" |
| 2 | 1 dia | Perfil do barbeiro (PATCH /employees/me) |
| 3 | 1-2 dias | Capabilities: schema + GET/PUT + tela "Meus serviços" |
| 4 | 2 dias | Schedule: schema + GET/PUT + tela "Minha agenda" |
| 5 | 1 dia | Polish: offline indicator, idempotency keys, retry UX, smoke test |

**= Sprint 2: 5-7 dias.**

---

## Triggers pra reavaliar essas decisões

| Decisão | Reavaliar quando |
|---|---|
| Plain fetch → TanStack Query | Mobile tiver 10+ telas com cache cross-screen |
| BarberSchedule sem TimeOff | Primeiro barbeiro reclamar de marcar férias |
| Capabilities sem overrides | Comissionamento entrar (Sprint 6+) |
| Email auto-link → invite token | Entrar em produção paga (Sprint 7+) |
| `employee.role` → `tenant_membership.roles` | Aparecer caso onde divergem propositalmente |
| Meio termo → offline-first real | Sprint 8 (app customer) |
| AsyncStorage → secure storage | Entrada em prod + PII sensível |

---

## Decisões inalteradas (vindas dos ADRs anteriores)

- Stack: NestJS + Prisma + Neon + Expo + NativeWind (ADR-002)
- RLS pattern: deny-by-default + SET LOCAL ROLE app_user (ADR-002 Sprint 1)
- Form: react-hook-form + Zod (ADR-002)
- Validação compartilhada: `@barbearia/schemas` (ADR-002)
