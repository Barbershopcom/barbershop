# Smoke test — Sprint 4: booking público + tela Hoje

Validação manual end-to-end: cliente reserva via curl → barbeiro vê
na tela Hoje → admin cancela → cliente vê slot liberado novamente.

## Pré-requisitos

- API rodando (`pnpm --filter @barbearia/api dev`)
- Migrations aplicadas:
  - `20260526114654_appointments`
  - `20260526141332_appointments_exclude_idempotency`
  - `20260526141737_service_buffer_min`
- Tenant onboardado com:
  - slug conhecido (`<SLUG>`)
  - barbershop com hours num dia
  - service ativo com `durationMin` definido
  - employee ativo com role admin_barber + capability pro service +
    BarberSchedule no mesmo dia
- App business mobile compilando (`pnpm --filter @barbearia/mobile-business dev`)

## Variáveis de teste

```bash
SLUG=barbearia-do-ze
SERVICE=<uuid>
BARBER=<uuid>
START=2026-05-27T13:00:00.000Z   # 10:00 BRT
KEY=$(uuidgen)                    # ou: python -c "import uuid; print(uuid.uuid4())"
```

## Fluxos a verificar

### 1. Slots vazio → reservar → slot some

```bash
# 1.1 GET slots — deve incluir 10:00 (13:00Z) BRT
curl "http://localhost:3333/public/tenants/$SLUG/slots?serviceId=$SERVICE&from=2026-05-27&to=2026-05-27" | jq

# 1.2 POST booking
curl -X POST "http://localhost:3333/public/tenants/$SLUG/appointments" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d "{
    \"serviceId\": \"$SERVICE\",
    \"barberId\": \"$BARBER\",
    \"startAt\": \"$START\",
    \"customerName\": \"João da Silva\",
    \"customerPhone\": \"+5511999999999\"
  }" | jq

# Aguarda > 10s (cache HTTP)
sleep 11

# 1.3 GET slots de novo — slot 10:00 some
curl "http://localhost:3333/public/tenants/$SLUG/slots?serviceId=$SERVICE&from=2026-05-27&to=2026-05-27" | jq
```

- [ ] 1.1: response inclui `startAt: "2026-05-27T13:00:00.000Z"`
- [ ] 1.2: status 201, body com `id`, `status: "booked"`, customer fields ecoados
- [ ] 1.3: slot 13:00Z não aparece mais; outros slots ok

### 2. Idempotency

```bash
# Mesma key + mesmo body
curl -i -X POST "http://localhost:3333/public/tenants/$SLUG/appointments" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d "<mesmo body>" | jq
```

- [ ] Status 201 (replay), mesmo response body, MESMO `id` (não criou outro)
- [ ] Confirma no DB: `SELECT COUNT(*) FROM appointments WHERE id=...` = 1

### 3. Idempotency mismatch

```bash
# Mesma key + body diferente (ex: customerName mudou)
curl -X POST ... -H "Idempotency-Key: $KEY" -d '{...customerName: "Outro"...}'
```

- [ ] 422 com `code: "idempotency_mismatch"`

### 4. Race condition (slot já tomado)

```bash
# Sem aguardar cache, com NOVA key, tenta reservar o MESMO horário
KEY2=$(uuidgen)
curl -X POST ... -H "Idempotency-Key: $KEY2" -d "$BODY_MESMO_STARTAT"
```

- [ ] 422 `slot_unavailable` (revalidação detecta antes do INSERT)
- [ ] OU 409 `slot_taken` (se cache HTTP servir slot stale e EXCLUDE constraint pegar)

### 5. Booking inválido — slot fora dos horários da loja

```bash
# Tenta reservar 06:00 BRT num dia que loja só abre 9:00
curl -X POST ... -d '{"startAt":"2026-05-27T09:00:00Z",...}'
```

- [ ] 422 `slot_unavailable`

### 6. Validação Zod

- [ ] customerPhone sem `+` → 400 com errors.customerPhone
- [ ] customerName 1 char → 400
- [ ] startAt sem `Z` → 400 (ou normaliza? testar)
- [ ] Idempotency-Key faltando → 400
- [ ] Idempotency-Key não-UUID → 400

### 7. Tela Hoje (mobile-business)

- [ ] App mobile abre `/inicio`
- [ ] Banner mostra "1 agendamento hoje" (se reservou pra hoje)
- [ ] Lista mostra hora, nome do cliente, nome do serviço
- [ ] Botão de telefone abre dialer com número do cliente
- [ ] Pull-to-refresh atualiza após criar appointment via curl
- [ ] Empty state "Sem agendamentos hoje" quando lista vazia

### 8. Admin cancel

```bash
APPT_ID=<id retornado em 1.2>
TOKEN=<JWT do admin>

curl -X PATCH "http://localhost:3333/admin/appointments/$APPT_ID/cancel" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] 204 No Content
- [ ] DB: `status='cancelled'`
- [ ] GET slots após 10s mostra horário liberado de novo
- [ ] Re-cancelar mesmo id: 204 (idempotente)
- [ ] User sem role admin → 403

### 9. Rate limit

- [ ] 11 POST/min mesmo IP → 429 Too Many Requests
- [ ] Após 60s, normaliza

### 10. Buffer entre appointments

```bash
# Admin atualiza service.bufferMin = 15
curl -X PATCH "http://localhost:3333/services/$SERVICE" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bufferMin": 15}'

# GET slots
curl ".../slots?..." | jq
```

- [ ] Slots após appointment respeitam buffer (próximo slot > appt.endAt + 15min)

## Bugs conhecidos / não-objetivos

- Cliente cancelar self-service (Sprint 5)
- Notificação ao barbeiro (Sprint 6+ — push, email ou SMS)
- BarberTimeOff (Sprint 5+)
- Reagendamento (Sprint 5+ — admin cancela e cliente refaz)
- Cleanup de idempotency_keys antigas (cron job posterior)
