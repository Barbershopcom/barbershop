# ADR-005: Sprint 4 — Booking público + tela Hoje

- **Data:** 2026-05-26
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-004 com Sprint 4)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 4 entrega a primeira escrita pública: cliente final reserva
slot via `POST /public/tenants/:slug/appointments`. Aparece race
condition (dois cliques no mesmo slot), idempotência (retry depois de
network failure), validação cruzada com algoritmo de slots, e listing
no mobile-business pro barbeiro ver os appointments do dia.

Princípio guia continua: usar o que tá validado, complexidade só com
gatilho.

---

## Decisões

### 1. Sem autenticação de cliente no MVP

Cliente reserva passando `name` + `phone`. Sem login, sem confirmação
SMS, sem magic link. Customer accounts entram **no Sprint 8** (junto
com app cliente nativo).

- Spam mitigado por throttler (10 POST/min/IP) — tráfego ainda é zero.
- Friction de "criar conta antes de marcar" mataria o produto MVP.

### 2. Idempotency-Key obrigatório + tabela dedicada

Cliente gera UUID antes do POST. Header `Idempotency-Key: <uuid>`
obrigatório (400 sem ele).

```sql
CREATE TABLE idempotency_keys (
  key              UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  request_hash     TEXT NOT NULL,       -- sha256 do body normalizado
  response_status  INT  NOT NULL,
  response_body    JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys(created_at);
```

- Mesma key + mesmo hash → retorna response cacheado (200/201/409/422)
- Mesma key + hash diferente → 422 "idempotency mismatch"
- TTL 24h (cleanup job posterior — `DELETE WHERE created_at < now() - interval '24h'`)
- Não usa unique constraint em appointments porque também cacheamos
  erros (cliente retry de um 409 não cria order novo).

### 3. Conflict detection via Postgres EXCLUDE GIST

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status = 'booked');
```

- DB rejeita atomicamente. App captura SQLSTATE `23P01` → 409.
- `WHERE status='booked'`: cancelados liberam o horário (cancel + remarcar
  funciona naturalmente).
- Range `[)` (half-open): appointment 14:00-15:00 não conflita com 15:00-16:00.
- **Primeira extension Postgres do projeto.** Aceito porque booking é
  caso clássico de range exclusion sem solução melhor (SELECT FOR UPDATE
  + check funciona mas é mais frágil em multi-conexão e tem 0 vantagem
  vs constraint nativa).

### 4. Revalidação pré-INSERT com SlotsService

Antes do INSERT, app roda algoritmo de slots server-side com janela
mínima (esse dia × esse barbeiro × esse serviço). Verifica se
`startAt` requisitado está no conjunto retornado.

- Se não bate: 422 "horário indisponível"
- EXCLUDE constraint é 2ª linha de defesa contra race condition entre
  check e insert
- Reusa `SlotsService.compute()` — mesma lógica, sem duplicação

### 5. Campos do cliente

Schema input:

```ts
{
  serviceId: uuid,
  barberId: uuid,
  startAt: ISO 8601 UTC,
  customerName: string (2-120 chars, trim),
  customerPhone: E.164 (já existe phoneE164Schema em common.ts),
  customerEmail?: email opcional
}
```

- `endAt` derivado server-side (`startAt + service.durationMin`).
- Email opcional pensando em Sprint 5 que vai mandar confirmação.

### 6. Cancelamento

- **Cliente cancela** → deferido pra Sprint 5 (magic link SMS/email)
- **Admin cancela** → `PATCH /admin/appointments/:id/cancel` no Sprint 4 (Phase 4)
- MVP: cliente liga pra barbearia → admin cancela pelo painel

### 7. Notificação ao barbeiro → mobile pull-based no Sprint 4

- Sem push notification (Sprint 6+ council próprio: SMS vs email vs Expo push)
- Barbeiro abre app, vê tela "Hoje" com lista atualizada
- Pull-to-refresh dispara `GET /me/appointments?from=hoje&to=hoje`

### 8. Buffer entre appointments

Nova coluna `service.buffer_min INT NOT NULL DEFAULT 0`.

- `SlotsService.compute()` recebe `bufferMin` e estende overlap check:
  appointment de 10-11 com buffer 15min "bloqueia" até 11:15 → próximo
  slot mínimo é 11:30 (se step=30min) ou 12:00 (se step=60min).
- Aplicado em validação pré-INSERT também.
- Per-barber buffer fica deferido (raramente útil — anotado como tech debt).

### 9. Rate limit booking

- POST `/public/tenants/:slug/appointments`: **10/min/IP**
- GET `/public/tenants/:slug/slots`: continua 60/min/IP
- Throttle por IP é suficiente — phone-based seria custo a mais sem
  ganho real pra MVP.

### 10. Tela "Hoje" no mobile-business

Vertical slice: Sprint 4 não fecha sem barbeiro CONSEGUIR ver
appointments criados.

- Substitui conteúdo placeholder de `/inicio` (banner "Em breve") por
  lista real do dia: hora + serviço + cliente nome + telefone (tap pra
  ligar via `tel:` link).
- Pull-to-refresh + spinner.
- Empty state "Sem agendamentos hoje" claro.
- Banner do topo com contagem ("3 agendamentos hoje") + indicador
  visual (laranja se >0, neutro se 0).

---

## Schema additions Sprint 4

```sql
-- Migration: appointments_exclude_overlap + idempotency
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status = 'booked');

ALTER TABLE services ADD COLUMN buffer_min INT NOT NULL DEFAULT 0;
ALTER TABLE services ADD CONSTRAINT services_buffer_min_check
  CHECK (buffer_min >= 0 AND buffer_min <= 240);

CREATE TABLE idempotency_keys (
  key              UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  request_hash     TEXT NOT NULL,
  response_status  INT NOT NULL,
  response_body    JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys(created_at);
-- RLS: bypass via PrismaService default role (consistente com slots).
-- App-level garante key+tenantId scoping.
```

---

## Plano de execução (4 fases vertical slice)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 1-2 dias | Backend `GET /me/appointments` + tela "Hoje" no mobile (substitui placeholder em /inicio) |
| 2 | 2 dias | Backend `POST /public/tenants/:slug/appointments` + idempotency + EXCLUDE + revalidação |
| 3 | 0.5 dia | `service.bufferMin` schema + propagação em SlotsService + ajuste em capabilities UI |
| 4 | 0.5 dia | `PATCH /admin/appointments/:id/cancel` + smoke test end-to-end |

**= Sprint 4: 4-5 dias.**

---

## Triggers pra reavaliar

| Decisão | Reavaliar quando |
|---|---|
| Cliente sem auth | Spam/no-show virar problema (telemetria de cancel rate) |
| Tabela idempotency_keys | Volume > 100k/dia (mover pra Redis) |
| EXCLUDE GIST | Performance < 50ms p95 conflitar com volume |
| Sem notification | Barbeiro reclamar de "perder marcação" |
| Cancel só admin | Cliente reclamar de friction |
| Buffer só per-service | Algum tenant pedir per-barber |
| Rate limit por IP | NAT corporativo bater no limit |

---

## Decisões inalteradas (vindas dos ADRs anteriores)

- Stack: NestJS + Prisma + Neon (ADR-002)
- Endpoints públicos bypassam RLS via PrismaService default role
  (ADR-004 §5)
- Slots algoritmo step=durationMin + overlap check (ADR-004 §refactor)
- Validação compartilhada `@barbearia/schemas` (ADR-002)
