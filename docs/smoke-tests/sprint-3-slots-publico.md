# Smoke test — Sprint 3: endpoint público de slots

Validação manual de `GET /public/tenants/:slug/slots` antes de fechar
sprint. Cobre os edge cases do ADR-004 §8.

## Pré-requisitos

- API rodando (`pnpm --filter @barbearia/api dev`)
- Migration `20260526114654_appointments` aplicada
- Tenant onboardado com:
  - slug conhecido (ex: `barbearia-do-ze`)
  - 1 barbershop
  - ≥1 service ativo, com `durationMin` definido (ex: 60)
  - ≥1 employee `isActive=true` com `BarberServiceCapability` pro service
  - `BarberSchedule` em algum weekday
  - `BarbershopHours` no mesmo weekday
- Seed de appointments rodado: `pnpm --filter @barbearia/api seed:appointments -- --tenant <slug>`

## Fluxos a verificar

### 1. Happy path

```
GET /public/tenants/<slug>/slots?serviceId=<id>&from=2026-05-26&to=2026-05-28
```

- [ ] 200 OK
- [ ] Header `Cache-Control: public, max-age=10` presente
- [ ] Body tem `timezone`, `tenantSlug`, `serviceId`, `serviceDurationMin`, `slots[]`
- [ ] `slots[].startAt` em UTC ISO-8601 (terminam com `Z`)
- [ ] Slots ordenados ascendentes por startAt
- [ ] Em horários com 2 barbeiros disponíveis, dois objetos no mesmo horário
- [ ] Slots seedados (10:00, 14:00, 16:00 BRT) NÃO aparecem (estão bloqueados)
- [ ] Slots às 9:00 e 11:00 BRT aparecem (não overlap com appt 10:00-11:00)

### 2. Filtro por barbeiro

```
GET .../slots?serviceId=<id>&barberId=<uuid>&from=...&to=...
```

- [ ] 200 OK, só esse barbeiro nos slots
- [ ] Se barbeiro não tem capability pro serviço, `slots: []`

### 3. Erros do cliente (400)

- [ ] `from` no formato errado (ex: `26-05-2026`) → 400 com `errors.from`
- [ ] `from > to` → 400 com mensagem clara
- [ ] Janela > 14 dias (ex: `from=2026-05-01&to=2026-06-30`) → 400
- [ ] `serviceId` não-UUID → 400

### 4. Erros de domínio (404)

- [ ] Slug inexistente → 404 "Tenant '<slug>' não encontrado"
- [ ] `serviceId` de outro tenant → 404 "Serviço não encontrado ou inativo"
- [ ] `serviceId` com `isActive=false` → 404 idem

### 5. Lista vazia (200 sem slots)

- [ ] `from` = dia que loja fecha (sem `barbershop_hours` no weekday) → `slots: []`
- [ ] `barberId` válido mas sem schedule no período → `slots: []`
- [ ] Janela toda no passado (`from`/`to` ontem) + `now` cortou tudo → `slots: []`

### 6. Sem auth

- [ ] Endpoint funciona sem header `Authorization`
- [ ] Endpoint funciona sem `X-Tenant-Id`
- [ ] Endpoint funciona sem cookie/sessão

### 7. Rate limit

- [ ] 61 requests em 60s do mesmo IP → 429 Too Many Requests
- [ ] Após 60s, request volta a passar

### 8. Cache HTTP

- [ ] Após reservar um appointment via SQL direto, primeira request seguinte
  AINDA mostra o slot (cache de 10s); após 10s, slot some
- [ ] Refetch antes de 10s vem do cache do cliente (DevTools mostra `from disk cache`)

### 9. Timezone

- [ ] Tenant com `timezone='America/Sao_Paulo'`: slot 9:00 BRT vira `12:00:00Z`
- [ ] Tenant com `timezone='America/Manaus'` (UTC-4): slot 9:00 vira `13:00:00Z`
  (criar tenant de teste com timezone custom)

### 10. Swagger

- [ ] `http://localhost:3333/api` mostra endpoint sob tag `public-slots`
- [ ] Params `slug`, `serviceId`, `barberId`, `from`, `to` documentados
- [ ] `barberId` marcado como opcional

## Comandos úteis

```bash
# Seed appointments
pnpm --filter @barbearia/api seed:appointments -- --tenant barbearia-do-ze

# Inspeção rápida
curl 'http://localhost:3333/public/tenants/barbearia-do-ze/slots?serviceId=<id>&from=2026-05-26&to=2026-05-28' | jq

# Limpar appointments seedados (manualmente via SQL)
psql $DATABASE_URL -c "DELETE FROM appointments WHERE customer_name = '__seed__';"
```

## Bugs conhecidos / não-objetivos

- Buffer entre appointments (Sprint 4 quando admin pedir)
- `POST /appointments` (Sprint 4 — booking real do cliente)
- Notification de novo agendamento (Sprint 8+)
- BarberTimeOff (Sprint 5+ quando barbeiro reclamar)
- Redis cache (não precisa pro volume MVP)
- Cloudflare WAF (out of scope MVP)
