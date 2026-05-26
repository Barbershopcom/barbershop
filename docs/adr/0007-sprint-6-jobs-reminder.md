# ADR-007: Sprint 6 — Background jobs + reminder 24h

- **Data:** 2026-05-26
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-006)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 5 deixou booking + cancel + email confirmation/cancellation
funcionando. Sprint 6 adiciona infraestrutura operacional:

1. Reminder de email 24h antes do appointment
2. Cleanup recorrente de `idempotency_keys`
3. Padrão de jobs background pra usar em sprints futuros

Constraint do council: zero custo, mínimo de complexidade de deploy.

---

## Decisões

### 1. Job queue: **pg-boss**, não BullMQ/Inngest

- Postgres já está rodando — zero infra nova
- BullMQ → Redis → +R$/mês ou +1 service no Railway
- Inngest → vendor lock-in + custo após free tier
- pg-boss: maduro, LISTEN/NOTIFY + advisory locks, retry built-in

### 2. Worker no mesmo processo Node da API

Single process pra começar. Trade simplicidade de deploy por isolamento
operacional. Reavaliar quando jobs ficarem CPU-heavy.

- Deploy: 1 service Railway, comando `node dist/main.js`
- Bootstrap pg-boss em `OnModuleInit` do NestJS, shutdown em `OnModuleDestroy`

### 3. Reminder = email 24h antes do `appointment.startAt`

Padrão da indústria. Fixed em 24h no MVP (sem configuração per-tenant —
Sprint 7+ quando aparecer demanda).

- Dispatch no `BookingService.book()` após INSERT: `boss.send('appointment-reminder', { apptId }, { startAfter: startAt - 24h, ... })`
- Skip dispatch se appt < 24h no futuro (reminder não faz sentido)
- Skip silencioso se `customerEmail` for null

### 4. Cancel: job continua agendado, job worker checa status

Quando cliente/admin cancela, **não** tentamos cancelar o job na queue.
Em vez disso, o worker do reminder, ao executar, verifica
`appointment.status === 'booked'` e `reminder_sent_at IS NULL`. Se não,
no-op.

- Mais robusto que tracking de jobId
- Simples: cancel handler não precisa saber sobre jobs
- Custo: cycle do scheduler vai gastar 1 worker tick por reminder
  cancelado, trivial

### 5. Idempotência via coluna `reminder_sent_at`

```sql
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMPTZ;
CREATE INDEX appointments_reminder_pending_idx
  ON appointments(start_at)
  WHERE status = 'booked' AND reminder_sent_at IS NULL;
```

Worker flow:
1. SELECT appointment
2. If status != 'booked' OR reminder_sent_at IS NOT NULL → return (no-op)
3. Envia email via Resend
4. Se sucesso: UPDATE reminder_sent_at = now()
5. Se falha: throw → pg-boss retry com backoff

pg-boss garante 1 consumidor por job — sem race entre workers.

### 6. Cleanup `idempotency_keys`: cron diário 4am UTC

```ts
boss.schedule('idempotency-cleanup', '0 4 * * *', {}, { tz: 'UTC' });
```

Worker faz `DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours'`. Baixo custo. Em SP = 1am, low-traffic.

### 7. Retry strategy: 3 tentativas com backoff exponencial

`retryLimit: 3, retryBackoff: true` no envio do job. Default da pg-boss:
2^attempt segundos (2s, 4s, 8s). Após 3 fails, vai pra estado `failed`.

Dead letter monitoring é Sprint 8+ (com observability).

### 8. Sem push notifications

- Cliente: Sprint 8 (com customer mobile app)
- Barbeiro: deferido até barbeiro reclamar (Expo Push grátis mas dev
  time não é trivial)

### 9. Sem telemetria/dashboard

Sem tráfego real ainda. Logs estruturados no `Logger` do Nest são
suficientes pra debug. Dashboard quando entrar produção paga.

### 10. PG-boss usa `DIRECT_URL` do Prisma

pg-boss usa LISTEN/NOTIFY e advisory locks que **não funcionam via
pgbouncer transaction mode** (que é o pooler do Neon usado pelo Prisma
runtime). Reusamos o `DIRECT_URL` (sem pooler) que já existe pra Prisma
Migrate.

---

## Plano de execução (4 fases)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 0.5 dia | Schema `reminder_sent_at` + install pg-boss + `JobsModule` + bootstrap pg-boss |
| 2 | 1 dia | Worker `appointment-reminder` + template email + idempotência |
| 3 | 0.5 dia | Dispatch no booking-create (sem cancel handler — worker auto-detecta) |
| 4 | 0.5 dia | Cleanup `idempotency_keys` agendado + smoke test |

**= Sprint 6: 2-3 dias.**

---

## Triggers pra reavaliar

| Decisão | Reavaliar quando |
|---|---|
| Single process worker | Jobs ficarem CPU-heavy ou batch > 1k/dia |
| 24h fixo | Tenant pedir configuração custom |
| pg-boss | Volume > 10k jobs/dia (Postgres CPU sofre) |
| Sem push barbeiro | Barbeiro reclamar de "perdi marcação" |
| 3 retries | Resend ficar flaky frequente |
| Sem dashboard | Entrar produção paga |

---

## Decisões inalteradas

- Stack NestJS + Prisma + Neon (ADR-002)
- Email via Resend free tier (ADR-006 §2)
- EmailService é best-effort silent fail (ADR-006 §2)
- Templates HTML literais (ADR-006 §3)
