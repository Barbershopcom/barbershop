# ADR-006: Sprint 5 — Cancel self-service + email + admin agenda

- **Data:** 2026-05-26
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-005 com fechamento de booking loop)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 4 deixou booking funcionando end-to-end (cliente reserva, barbeiro
vê, admin cancela via curl). Faltam 3 frentes pra fechar o ciclo:

1. Cliente cancelar sem ligar pra barbearia
2. Cliente receber confirmação por email
3. Admin gerenciar appointments pela UI web (não só curl)

Constraint forte do council: **zero custo no MVP**. Nada de SMS, nada
de domain registration ainda.

---

## Decisões

### 1. Customer cancel via magic link por **email**

Sem SMS. Token HMAC-SHA256 assinado, embutido em URL:

```
https://app.../cancel/<base64url(payload)>.<base64url(signature)>
```

- Payload: `{ apptId: uuid, exp: unix }`
- TTL = `appointment.startAt` (link inválido após o horário)
- Secret HMAC em env (`APPOINTMENT_CANCEL_SECRET`)
- Sem revogação explícita: se cliente reservar, cancelar e fizer outro
  appointment, gera token novo.

### 2. Email via **Resend** (free tier)

- 100/dia, 3000/mês — suficiente pra MVP
- Sandbox `onboarding@resend.dev` aceita envio só pro dono da API key
- Quando o produto for shipar pra cliente real → comprar domain, fazer
  DNS verification, mudar `from`
- Variável `RESEND_API_KEY` no env (opcional; sem ela, EmailService
  loga warning e funciona como no-op — não trava booking)

### 3. Templates em **HTML literal string**, sem React Email

2 templates (confirmation, cancelled) com ~30 linhas cada. React Email
adiciona deps + ceremônia pra ganho nulo nesse volume.

- Helper `renderTemplate(name, vars)` em `templates/`
- Strings com placeholder `{{var}}` substituído via replace simples
- Se chegarmos a 5+ templates ou client variations (Gmail vs Outlook
  quebrando), migra pra React Email.

### 4. Web admin `/admin/agenda`

Lista tabular (não calendar view). Por linha:

- Hora + duração
- Cliente (nome + telefone clicável `tel:`)
- Serviço + barbeiro
- Status badge
- Botão "Cancelar" → confirm dialog → `PATCH /admin/appointments/:id/cancel`

Filtros: range de datas (default próximos 7 dias) + barbeiro (opcional).

Calendar view com drag-to-reschedule fica pra **Sprint 7+**.

### 5. Atribuição de cancel

```sql
ALTER TABLE appointments
  ADD COLUMN cancelled_by  TEXT,
  ADD COLUMN cancelled_at  TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;

ALTER TABLE appointments ADD CONSTRAINT appointments_cancelled_by_check
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'admin', 'system'));
```

Quando `status='cancelled'`, `cancelled_by` deve ser não-null. Não force
via constraint (cancelar de cima pra baixo via Prisma fica chato);
controllers garantem.

### 6. Cleanup de idempotency_keys → deferido

Sprint 6 vai trazer pg-boss (lembrete 24h). Aproveita pra cleanup
agendado. Volume MVP é trivial.

### 7. Sem notificação push pro barbeiro

Continua pull-based. Cliente é o que precisa nudge (email pós-booking +
reminder Sprint 6).

### 8. Rate limit cancel público: 20/min/IP

Cliente abre link, hesita, fecha, reabre — 10/min daria 429 legítimo.

### 9. Two-step cancel (GET confirm + POST execute)

- `GET /cancel/:token` → tela "Cancelar agendamento de João dia 27/05 às 14h? [Sim] [Não]"
- `POST /cancel/:token` → executa + tela "Cancelado"

Protege contra bots de preview de link (Gmail/iMessage fazem fetch GET).

### 10. Sem reagendamento

Cliente cancela + cria novo. Reagendamento preservando id é Sprint 7+
(junto com calendar admin).

---

## Schema additions Sprint 5

```sql
ALTER TABLE appointments
  ADD COLUMN cancelled_by  TEXT,
  ADD COLUMN cancelled_at  TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;

ALTER TABLE appointments ADD CONSTRAINT appointments_cancelled_by_check
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'admin', 'system'));

-- Index pra query "appointments cancelados por cliente" (analytics futura)
CREATE INDEX appointments_cancelled_by_idx ON appointments(cancelled_by)
  WHERE cancelled_by IS NOT NULL;
```

---

## Plano de execução (4 fases)

| Fase | Duração | Entregável |
|---|---|---|
| 1 | 1 dia | Migration cancel attribution + EmailService (Resend) + env vars |
| 2 | 1-2 dias | Magic link: HMAC encode/decode + `GET/POST /public/appointments/cancel/:token` + página Next.js de confirm |
| 3 | 1-2 dias | Templates confirmation + cancelled, disparados de BookingService e admin/customer cancel controllers |
| 4 | 1 dia | Web admin `/admin/agenda` — tabela + filtros + cancel |

**= Sprint 5: 4-6 dias.**

---

## Triggers pra reavaliar

| Decisão | Reavaliar quando |
|---|---|
| Só email, sem SMS | Cliente reclamar de "não vi email" repetidamente |
| Resend free tier | Volume > 3000/mês ou domain BR ficar caro |
| HTML literal | 5+ templates ou breakage cross-client |
| Tabela admin (não calendar) | Admin pedir calendar (Sprint 7+) |
| Sem reagendar | Admin reclamar de "cancelar + criar é trabalhoso" |
| Cleanup deferido | idempotency_keys > 100k linhas |
| Two-step cancel | Cliente reclamar de "tive que clicar 2x" |

---

## Decisões inalteradas (vindas dos ADRs anteriores)

- Stack NestJS + Prisma + Neon (ADR-002)
- Endpoints públicos bypassam RLS (ADR-004 §5)
- Validação compartilhada `@barbearia/schemas` (ADR-002)
- `app/inicio` = tela Hoje (ADR-005 §10)
