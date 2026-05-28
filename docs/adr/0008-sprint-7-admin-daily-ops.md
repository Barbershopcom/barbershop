# ADR-008: Sprint 7 — Admin daily ops complete

- **Data:** 2026-05-28
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-006/007)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprints 4-6 deixaram o booking funcionando ponta-a-ponta com email
confirmação + reminder + cancel self-service. A `/admin/agenda` é uma
**lista MVP** — funciona pra QA mas não é ferramenta de trabalho.

Sprint 7 vira agenda admin em produto: calendar view, drag-to-reschedule,
BarberTimeOff, manual booking. É a sprint maior até agora (5 dias)
porque cobre o flow que admin usa todo dia.

---

## Decisões

### 1. **FullCalendar** (Standard, MIT) — não react-big-calendar

Decidido em council com usuário. Trade: licença mais polida (mas premium
plugins pagos — não usamos), em troca de UX melhor.

- Packages: `@fullcalendar/react`, `@fullcalendar/daygrid`,
  `@fullcalendar/timegrid`, `@fullcalendar/interaction`
- Premium (`@fullcalendar/scheduler`, `@fullcalendar/resource-*`)
  **NÃO** entra — pago. Se aparecer demanda de "view por barbeiro lado-a-lado",
  reavalia (Sprint 9+).
- Views: **semana** (default landing) + **dia**. Sem month view.

### 2. Drag-to-reschedule = true reschedule

Endpoint novo `PATCH /admin/appointments/:id/reschedule` com `{ newStartAt }`:

1. Carrega appointment + valida `status='booked'`
2. Calcula `newEndAt = newStartAt + service.durationMin`
3. Revalida slot usando `SlotsService.compute()` com janela mínima
4. UPDATE atômico — EXCLUDE constraint pega race condition
5. Regenera token de cancel + manda email "Seu horário foi remarcado"

Preserva `id`, `created_at`, `customer_*`. Apenas `start_at`/`end_at` mudam.

### 3. Magic link token regenera no reschedule

Token tem `exp = appointment.startAt`. Reschedular pra mais tarde faria
o link velho (no email de confirmação original) expirar cedo demais.

**Decisão:** ao reschedular, regenera token com novo `exp` e manda email
fresh. Email antigo fica obsoleto mas o link velho **continua válido até
o startAt antigo** (não é vulnerabilidade, é apenas inconsistência).

Reverter pra `exp` fixo de 30 dias seria simpler mas alarga janela de
abuso se token vazar.

### 4. BarberTimeOff — schema simples, sem recorrência

```sql
CREATE TABLE barber_time_off (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  barber_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_at   TIMESTAMPTZ NOT NULL,
  end_at     TIMESTAMPTZ NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT barber_time_off_range_check CHECK (end_at > start_at)
);
CREATE INDEX barber_time_off_tenant_idx ON barber_time_off(tenant_id);
CREATE INDEX barber_time_off_barber_range_idx
  ON barber_time_off(barber_id, start_at, end_at);
```

Range arbitrário (1h a 30 dias). Recorrência ("todo domingo é folga")
é Sprint 9+. RLS tenant-scoped padrão (ADR-002).

### 5. TimeOff auto-cancela appointments overlapping com confirmação

Ao criar TimeOff:
1. Query appointments com `status='booked'` no range
2. Modal: "Esse período tem N agendamentos. Cancelar todos?"
3. Confirm → batch update `status='cancelled', cancelled_by='system', cancel_reason='Funcionário indisponível: <reason>'`
4. Dispara email de cancelamento pra cada cliente

Sem modal = admin não sabe o que aconteceu. Confirmation sempre.

### 6. SlotsService aprende TimeOff

`SlotsRepository.loadSlotInputs()` carrega TimeOff overlapping. `SlotsService.compute()`
recebe lista de TimeOff por barbeiro e subtrai do working ranges via `subtract()` helper
existente.

Booking revalidation também checa — TimeOff bloqueia booking público novo.

### 7. Admin manual booking — modal `+ Novo agendamento` no /admin/agenda

UI confirmada com usuário. Endpoint `POST /admin/appointments`:
- Sem Idempotency-Key (admin não é flow retentável)
- Sem throttle agressivo (admin operando UI)
- Revalida slot (mesma lógica do público)
- Telefone opcional (admin pode reservar sem telefone)
- Email opcional (sem email = sem confirmação)
- `cancelled_by` ainda existe se admin cancelar depois

### 8. Toggle "Incluir cancelados/concluídos" no /admin/agenda

Checkbox que liga `includeAllStatuses=true` no GET. Junto, badges visuais
de status (Booked = verde, Cancelled = cinza riscado, Completed = azul,
No-show = laranja).

### 9. `cancelReason` opcional ao cancelar via admin

Modal de confirmação ganha textarea opcional. Salva em `cancel_reason`.
Mostra na linha do appointment quando filtra cancelados.

### 10. Per-tenant reminder timing — deferido

Continua 24h fixo. Sprint 9+ quando algum tenant pedir.

---

## Schema additions Sprint 7

Migration única `barber_time_off` com policy RLS tenant-scoped.
Sem mudança em outras tabelas (cancel_reason já existia desde Sprint 5).

---

## Plano de execução (5 fases)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 0.5 dia | Migration `barber_time_off` + Zod + CRUD admin endpoint |
| 2 | 1 dia | SlotsService aprende TimeOff + revalidação no book/reschedule |
| 3 | 2 dias | FullCalendar view + drag-to-reschedule endpoint + email "remarcado" |
| 4 | 1 dia | `POST /admin/appointments` + modal "Novo agendamento" |
| 5 | 0.5 dia | Toggle includeAllStatuses + cancelReason input + badges |

**= Sprint 7: 5 dias.**

---

## Triggers pra reavaliar

| Decisão | Reavaliar quando |
|---|---|
| FullCalendar Standard | Demanda de resource view (premium) |
| Sem month view | Admin pedir planejamento mensal |
| Auto-cancel ao marcar TimeOff | Admin reclamar de "cancelou sem perguntar" |
| Token regen no reschedule | Cliente reclamar de "link veio de novo" |
| Sem recorrência TimeOff | Tenant pedir "todo domingo" |
| 24h reminder fixo | Tenant pedir custom timing |

---

## Decisões inalteradas

- Stack NestJS + Prisma + Neon (ADR-002)
- Endpoints públicos bypassam RLS (ADR-004 §5)
- Email best-effort via Resend (ADR-006)
- pg-boss + worker mesmo processo (ADR-007 §2)
