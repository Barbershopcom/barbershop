# ADR-004: Sprint 3 — Algoritmo de slots + endpoint público

- **Data:** 2026-05-26
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-003 com Sprint 3)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 3 entrega o cálculo de slots disponíveis: intersecção
`BarbershopHours ∩ BarberSchedule − Appointment`. Esse é o coração do
booking; tudo que vem depois (app cliente, notificações, no-show) depende
dele estar correto.

Decisões precisam ser fechadas antes de codar porque envolvem timezone,
modelo de Appointment (novo) e exposição pública (sem auth — primeiro
endpoint não autenticado do projeto).

---

## Decisões

### 1. Compute em TS, não em SQL

Algoritmo roda no NestJS, não em função Postgres.

- Trade-off: TS é mais legível, testável (Jest unit), e mais fácil de
  evoluir (futuras regras: buffer, no-show penalty, prioridade).
- Custo: 1 round-trip a mais (busca todas as linhas → calcula em Node).
  Volume Sprint 3 é trivial (≤14 dias × ≤10 barbeiros × ≤50 appointments
  = ~7k linhas worst-case). Não chega perto de gargalo.
- Reavaliar quando: tempo de resposta ultrapassar 200ms no p95 em
  produção.

### 2. Timezone via `date-fns-tz`

Não usar `Temporal` (proposta TC39) — ainda precisa polyfill em Node
e API ainda muda. `date-fns-tz` é maduro, RN-friendly, e cobre o caso
core: converter `HH:MM` no timezone do tenant pra instante UTC.

- Brasil aboliu horário de verão em 2019, mas tenant pode estar em UTC
  diferente futuramente (ex: filial em Manaus = UTC-4). `tenant.timezone`
  é a fonte da verdade — nunca assumir `America/Sao_Paulo`.

### 3. Modelo Appointment minimal já em Sprint 3

Não esperar Sprint 4 pra introduzir. Razão: sem Appointment, slots
sempre retornam tudo livre — algoritmo de subtração fica não-testável
end-to-end.

```sql
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  barbershop_id   UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id       UUID NOT NULL REFERENCES employees(id)   ON DELETE RESTRICT,
  service_id      UUID NOT NULL REFERENCES services(id)    ON DELETE RESTRICT,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,         -- E.164 quando informado
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'booked',  -- booked|cancelled|completed|no_show
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `end_at` armazenado (não derivado) pra blindar contra mudança futura
  de `service.duration_min`.
- `ON DELETE RESTRICT` em service/barber: não deixa apagar entidade
  que tem appointment ligado (mantém histórico). Solução: soft-delete
  via `is_active = false` (já existe no Service; adicionar em Employee
  no Sprint 4).
- `status` como TEXT não enum: Postgres enums são chatos pra migrar
  (ADR-001 padrão).
- Sem endpoint POST/PUT/PATCH no Sprint 3 — populado via seed/SQL pra
  testar slots. Endpoint de criação vem no Sprint 4 (booking real).

### 4. Endpoint público em `/public/tenants/:slug/slots`

Sem auth (cliente final ainda não loga; Sprint 8). Slug → tenant lookup.

```
GET /public/tenants/:slug/slots
  ?serviceId=...
  &barberId=...        (opcional — sem = "qualquer barbeiro")
  &from=YYYY-MM-DD     (data no timezone do tenant)
  &to=YYYY-MM-DD
```

Resposta:

```json
{
  "timezone": "America/Sao_Paulo",
  "slots": [
    {
      "startAt": "2026-05-27T13:00:00.000Z",
      "barberId": "uuid",
      "barberName": "João"
    }
  ]
}
```

- **`startAt` retornado em UTC ISO-8601**, cliente formata pro timezone
  do tenant. Razão: ambíguo armazenar/transmitir local time. UTC é
  inequívoco; conversão é responsabilidade da UI.
- **Janela máxima 14 dias** entre `from` e `to`. Acima disso, 400.
  Protege DB e mantém resposta sub-200KB.
- **Slots em incrementos do `service.durationMin`** (não step fixo de
  15min). Razão: simplicidade. Se serviço de corte+barba = 60min e
  shop abre às 9, slots começam 9:00, 10:00, 11:00... — não 9:00, 9:15.
  Refinar depois se feedback pedir.
- **Filtro implícito:** `service.isActive = true`,
  `employee.isActive = true`, `appointment.status = 'booked'`.

### 5. Acesso público sem RLS-via-app_user

Endpoint público não tem `app.user_id` (sem JWT). Em vez de criar
infraestrutura paralela (role `app_public` + policies novas),
**bypass RLS via Prisma client privilegiado escopado ao módulo
público**.

- `PrismaPublicService` separado, usa role com `BYPASSRLS` (postgres
  superuser-style). Restrito a operações SELECT em tabelas pre-listadas
  via guard explícito no service (não no Postgres).
- Controller sempre filtra `WHERE tenant_id = ${resolvedTenantId}` —
  responsabilidade da aplicação. Tem cobertura em testes unitários.
- Não expõe PII de appointment: response **nunca inclui**
  `customer_name` ou `customer_phone`. Só `barberId`, `barberName`,
  `startAt`.

Por que não policies novas: criar role `app_public` + policies em 7
tabelas custa ~30 linhas SQL + rebuild de mental model. Pro MVP, com
1 endpoint público sob controle apertado, a guard na aplicação é
suficiente. Reavaliar quando: tivermos 3+ endpoints públicos com
shapes diferentes.

### 6. Rate limit no endpoint público

`@nestjs/throttler`, 60 req/min por IP. Suficiente pra cliente
legítimo (poll a cada 30s seria razoável); barra scraping casual.

- Não DDoS-proof — pra isso seria Cloudflare na frente. Fora do
  escopo MVP.

### 7. Cache HTTP curto

`Cache-Control: max-age=10, public` na resposta. 10s de stale é
aceitável: cliente que vê slot fantasma (já reservado por outro)
recebe erro no booking real → mostra mensagem "horário acabou de ser
ocupado, escolha outro". UX ok.

- Não usar Redis. Postgres aguenta carga atual.
- Reavaliar quando: p95 do endpoint passar de 100ms.

### 8. Edge cases que o algoritmo trata explicitamente

| Caso | Comportamento |
|---|---|
| Hoje, agora=14:30, slot 14:00 | Não retorna (já passou) |
| Hoje, agora=14:30, slot 15:00 com serviço 60min | Retorna |
| `from` = passado | Tratado como hoje (no max) |
| Barbeiro sem capability pro serviço | Excluído |
| Barbeiro inativo (`isActive=false`) | Excluído |
| Serviço inativo | 404 (não 200 vazio — sinal de erro do cliente) |
| Tenant slug inexistente | 404 |
| Janela > 14 dias | 400 com mensagem clara |
| Sem barbeiro disponível pra serviço | 200 com `slots: []` |
| Slot que cruzaria fim do dia do barbeiro | Excluído (deve caber integral) |
| Slot que cruza appointment existente | Excluído |

### 9. Buffer entre appointments (não escopo)

Cliente terminou 14:00, próximo slot 14:00? Sim — sem buffer. Buffer
(ex: 10min) entra **no Sprint 4** quando admin pedir.

- Implementação prevista: `service.bufferMin` (nullable, default 0).

### 10. Schema input/output via Zod compartilhado

`@barbearia/schemas/src/slots.ts`:

- `slotsQuerySchema` — valida query string
- `slotsResponseSchema` — formato resposta
- `appointmentSchema` — entidade (Sprint 4 vai usar)

Validação no controller via `ZodValidationPipe` (mesmo padrão Sprint 1+).

---

## Plano de execução (4 fases)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 1 dia | Appointment schema + migration + Zod schemas + seed helper |
| 2 | 2 dias | `SlotsService` puro + Jest unit tests cobrindo edge cases |
| 3 | 1 dia | `GET /public/tenants/:slug/slots` controller + throttler + cache header |
| 4 | 0.5 dia | Polish: Swagger docs, smoke test no insomnia/curl |

**= Sprint 3: 4-5 dias.**

---

## Triggers pra reavaliar essas decisões

| Decisão | Reavaliar quando |
|---|---|
| Compute em TS → função SQL | p95 > 200ms em produção |
| `date-fns-tz` → Temporal nativo | Node LTS shippar Temporal sem flag |
| App-guarded public read → role `app_public` | 3+ endpoints públicos |
| Step = duração do serviço → step fixo 15min | Cliente reclamar de slot mal-encaixado |
| Cache HTTP simples → Redis | p95 > 100ms |
| Throttler 60/min → Cloudflare WAF | Bot scraping virar problema |

---

## Decisões inalteradas (vindas dos ADRs anteriores)

- Stack: NestJS + Prisma + Neon (ADR-002)
- RLS pattern: deny-by-default + SET LOCAL ROLE app_user em rotas
  autenticadas (ADR-002 Sprint 1)
- Validação compartilhada: `@barbearia/schemas` (ADR-002)
- Replace-all em PUT, GET com filtros isActive (ADR-003)
