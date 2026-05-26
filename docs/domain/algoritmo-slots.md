# Algoritmo de slots disponíveis

Define como o backend calcula horários livres pra agendamento.
Referenciado por ADR-004 (Sprint 3).

## Inputs

- `tenant` (resolvido via slug)
- `service` (id → durationMin)
- `barberId?` (opcional — se vazio, considera todos os barbeiros com
  capability + schedule)
- `from`, `to` (datas YYYY-MM-DD, interpretadas no `tenant.timezone`)
- `now` (Date.now() — pra cortar slots no passado)

## Estado consultado

Pra cada barbeiro candidato:

1. **`barbershop_hours`** do barbershop do barbeiro, weekday em
   [from..to]
2. **`barber_schedules`** do barbeiro, weekday em [from..to]
3. **`appointments`** do barbeiro com `status='booked'` e overlap em
   [from..to+1d] (margem pra appointments que cruzam meia-noite)

Filtros aplicados antes:

- `employee.isActive = true`
- Existe `barber_service_capabilities(barber_id, service_id)`
- `service.isActive = true`

## Algoritmo (pseudocódigo)

```
for each day D in [from..to]:
  for each barber B candidato:
    weekday = D.getDay() no tenant.timezone

    # 1. Janelas "loja aberta"
    shop_ranges = barbershop_hours[B.shop, weekday]
                    -> [(opens, closes), ...]

    # 2. Janelas "barbeiro disponível"
    barber_ranges = barber_schedules[B.id, weekday]
                      -> [(opens, closes), ...]

    # 3. Intersect (loja AND barbeiro)
    working_ranges = intersect(shop_ranges, barber_ranges)

    # 4. Subtrai appointments
    free_ranges = subtract(working_ranges, appointments[B.id, D])

    # 5. Slice em incrementos do service.durationMin
    for each (start, end) in free_ranges:
      candidate = start
      while candidate + service.durationMin <= end:
        if (candidate + service.durationMin) <= end
           AND candidate >= now:
          emit { startAt: candidate.toUTC(), barberId: B.id, ... }
        candidate += service.durationMin
```

## Conversão timezone

Todos os campos `HH:MM` em `barbershop_hours` e `barber_schedules` são
interpretados no `tenant.timezone`. Cada dia D vira instante UTC via:

```ts
import { zonedTimeToUtc } from 'date-fns-tz';

const startUtc = zonedTimeToUtc(`${D} ${opens}`, tenant.timezone);
const endUtc   = zonedTimeToUtc(`${D} ${closes}`, tenant.timezone);
```

DST: Brasil não observa, mas `date-fns-tz` cobre se tenant futuro usar
timezone que observa. Edge case "23:30 num dia que ganha 1h" gera slot
em hora ambígua — date-fns-tz resolve pelo standard offset (escolha
estável).

## Função `intersect(rangesA, rangesB)`

```
result = []
for a in rangesA:
  for b in rangesB:
    s = max(a.start, b.start)
    e = min(a.end, b.end)
    if s < e: result.push({ start: s, end: e })
return merge_overlapping(result)
```

## Função `subtract(ranges, blocked)`

Pra cada `range` em `ranges`, remove cada `b` em `blocked`:

```
result = [range]
for b in blocked:
  next = []
  for r in result:
    if b.end <= r.start || b.start >= r.end:
      next.push(r)                       # sem overlap
    else:
      if r.start < b.start:
        next.push({ start: r.start, end: b.start })
      if b.end < r.end:
        next.push({ start: b.end, end: r.end })
  result = next
return result
```

## Casos de teste (Phase 2 cobre todos)

| # | Cenário | Esperado |
|---|---|---|
| 1 | Shop 9-18, barbeiro 9-18, 0 appointments, serviço 60min | 9 slots: 9, 10, ..., 17 |
| 2 | Shop 9-18, barbeiro 10-14, 0 appts, serviço 60min | 4 slots: 10, 11, 12, 13 |
| 3 | Shop 9-12 + 14-18, barbeiro 9-18, serviço 60min | 6 slots: 9, 10, 11, 14, 15, 16, 17 (12-14 fechado) |
| 4 | Appt 10:00-11:00, serviço 60min | Slots 9 e 11-17 (10 excluído) |
| 5 | Appt 10:30-11:30, serviço 60min | Slots 9 (termina 10:00 ok), 12, 13... (10 e 11 excluídos por overlap) |
| 6 | Serviço 90min, shop 9-12 | 2 slots: 9:00 e 10:30 (11:30 não cabe, fim seria 13) |
| 7 | from=hoje, agora=14:30 | Slots antes de 14:30 excluídos |
| 8 | Barbeiro sem capability pro serviço | Não aparece |
| 9 | Barbeiro inativo | Não aparece |
| 10 | Janela > 14 dias | Erro 400 (validação Zod) |
| 11 | 2 barbeiros, mesma janela livre | 2 slots no mesmo horário (um por barbeiro) |
| 12 | barberId filtrado | Só esse barbeiro |
