import { Injectable } from '@nestjs/common';
import { fromZonedTime } from 'date-fns-tz';

/**
 * Slots: algoritmo puro de cálculo de horários livres.
 *
 * Não toca em IO (DB, HTTP). Recebe estado já carregado, retorna lista
 * de slots. Isso permite testar todos os edge cases (timezone, overlap,
 * slicing) em Jest sem mock de Prisma.
 *
 * Algoritmo (ver docs/domain/algoritmo-slots.md):
 *   working = intersect(BarbershopHours, BarberSchedule)
 *   pra cada working range: gera candidatos com step=durationMin a partir
 *   do início do range; emite candidato se NÃO overlap com appointment.
 *
 * Isso garante slots "hora-cheia": shop abre 9, serviço 60min →
 * 9, 10, 11, ... mesmo se houver appointment quebrando a janela
 * (em vez de 9, depois 11:30, 12:30 vindo da quebra).
 *
 * Decisões em ADR-004:
 *  - step = duration do serviço (não step fixo 15min)
 *  - timezone via date-fns-tz (não Temporal)
 *  - "now" como input pra ser testável (sem Date.now() interno)
 */
@Injectable()
export class SlotsService {
  compute(input: SlotsInput): SlotOutput[] {
    const {
      timezone,
      serviceDurationMin,
      serviceBufferMin = 0,
      shopHours,
      barbers,
      fromDate,
      toDate,
      now,
    } = input;

    const shopHoursByWeekday = groupBy(shopHours, (h) => h.weekday);
    const dates = enumerateDates(fromDate, toDate);
    const stepMs = serviceDurationMin * 60_000;
    // Buffer estende o overlap window — appointment 14:00-15:00 com
    // bufferMin=15 bloqueia até 15:15. Novo slot mínimo: 15:15+.
    const bufferMs = serviceBufferMin * 60_000;
    const result: SlotOutput[] = [];

    for (const date of dates) {
      const weekday = weekdayOf(date);
      const shopRangesForDay = shopHoursByWeekday.get(weekday) ?? [];
      if (shopRangesForDay.length === 0) continue; // loja fechada nesse dia

      const shopRangesUtc = shopRangesForDay.map((r) => toRangeUtc(date, r, timezone));

      for (const barber of barbers) {
        const barberRangesForDay = barber.schedules.filter((s) => s.weekday === weekday);
        if (barberRangesForDay.length === 0) continue; // barbeiro não trabalha

        const barberRangesUtc = barberRangesForDay.map((r) => toRangeUtc(date, r, timezone));
        let working = intersect(shopRangesUtc, barberRangesUtc);

        // Subtrai TimeOff do working — barbeiro indisponível nessas faixas.
        if (barber.timeOff && barber.timeOff.length > 0) {
          const timeOffRanges: Range[] = barber.timeOff.map((t) => ({
            start: t.startAt,
            end: t.endAt,
          }));
          working = subtract(working, timeOffRanges);
        }

        for (const range of working) {
          let cursor = range.start.getTime();
          const rangeEnd = range.end.getTime();
          while (cursor + stepMs <= rangeEnd) {
            const slotStart = new Date(cursor);
            const slotEndMs = cursor + stepMs;
            // Buffer aplica-se APENAS pós-appointment (cleanup/limpeza).
            // Slot terminando exatamente quando appt começa é válido
            // (sem buffer "pra trás" — slot pre-appt não precisa de gap).
            // Mas slot tentando começar dentro de [apptEnd, apptEnd+buffer]
            // é inválido.
            const overlapsBooked = barber.appointments.some((a) => {
              const aStart = a.startAt.getTime();
              const aEnd = a.endAt.getTime();
              return aStart < slotEndMs && aEnd + bufferMs > cursor;
            });
            if (!overlapsBooked && slotStart >= now) {
              result.push({
                startAt: slotStart,
                barberId: barber.id,
                barberName: barber.displayName,
              });
            }
            cursor += stepMs;
          }
        }
      }
    }

    // Sort por startAt ascendente, depois por barberId (estável e previsível)
    result.sort((a, b) => {
      const diff = a.startAt.getTime() - b.startAt.getTime();
      return diff !== 0 ? diff : a.barberId.localeCompare(b.barberId);
    });

    return result;
  }
}

// --- Types -----------------------------------------------------------------

export interface HourRange {
  weekday: number; // 0=domingo..6=sábado
  opensAt: string; // "HH:MM"
  closesAt: string; // "HH:MM"
}

export interface BarberAppointment {
  startAt: Date;
  endAt: Date;
}

export interface BarberTimeOffRange {
  startAt: Date;
  endAt: Date;
}

export interface BarberInput {
  id: string;
  displayName: string;
  schedules: HourRange[];
  /** Appointments já filtrados a status que ocupam slot (awaiting_payment|pending|confirmed) e overlap com [from..to]. */
  appointments: BarberAppointment[];
  /**
   * Períodos de indisponibilidade (BarberTimeOff) que overlap com a janela
   * consultada. Sprint 7 (ADR-008 §6).
   */
  timeOff?: BarberTimeOffRange[];
}

export interface SlotsInput {
  timezone: string;
  serviceDurationMin: number;
  /**
   * Buffer pós-appointment em minutos (default 0). Aplica-se em ambos
   * os lados: appt 14-15 com buffer 15 → próximo slot >= 15:15.
   */
  serviceBufferMin?: number;
  shopHours: HourRange[];
  barbers: BarberInput[];
  /** YYYY-MM-DD no timezone do tenant. */
  fromDate: string;
  /** YYYY-MM-DD no timezone do tenant. */
  toDate: string;
  /** Instante "agora" — slots no passado são descartados. */
  now: Date;
}

export interface SlotOutput {
  startAt: Date;
  barberId: string;
  barberName: string;
}

// --- Helpers ---------------------------------------------------------------

export interface Range {
  start: Date;
  end: Date;
}

function parseYMD(s: string): [number, number, number] {
  // Formato já validado pelo Zod (YYYY-MM-DD) antes de chegar aqui.
  return [Number(s.slice(0, 4)), Number(s.slice(5, 7)), Number(s.slice(8, 10))];
}

/**
 * Enumera datas YYYY-MM-DD entre from e to (inclusive).
 * Usa aritmética em UTC (sem DST) pra evitar erro de fuso.
 */
function enumerateDates(from: string, to: string): string[] {
  const [fy, fm, fd] = parseYMD(from);
  const [ty, tm, td] = parseYMD(to);
  const out: string[] = [];
  let cursor = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  while (cursor <= end) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return out;
}

/** Weekday (0=Sun..6=Sat) de uma data calendar (sem tz — datas são intemporais). */
function weekdayOf(dateStr: string): number {
  const [y, m, d] = parseYMD(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Combina YYYY-MM-DD + HH:MM no timezone → instante UTC. */
function toRangeUtc(dateStr: string, range: { opensAt: string; closesAt: string }, tz: string): Range {
  return {
    start: fromZonedTime(`${dateStr} ${range.opensAt}:00`, tz),
    end: fromZonedTime(`${dateStr} ${range.closesAt}:00`, tz),
  };
}

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) existing.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/**
 * intersect(A, B): retorna ranges onde tanto A quanto B estão ativos.
 * A e B podem ter múltiplos ranges (ex: shop 9-12 + 14-18).
 */
export function intersect(a: Range[], b: Range[]): Range[] {
  const result: Range[] = [];
  for (const ra of a) {
    for (const rb of b) {
      const start = ra.start > rb.start ? ra.start : rb.start;
      const end = ra.end < rb.end ? ra.end : rb.end;
      if (start < end) result.push({ start, end });
    }
  }
  return mergeOverlapping(result);
}

/**
 * subtract(ranges, blocked): remove de cada range em `ranges` os
 * trechos cobertos por qualquer `blocked`. Pode quebrar 1 range em 2
 * (ex: range 9-18 menos 13-14 = [9-13, 14-18]).
 */
export function subtract(ranges: Range[], blocked: Range[]): Range[] {
  let current = [...ranges];
  for (const b of blocked) {
    const next: Range[] = [];
    for (const r of current) {
      if (b.end <= r.start || b.start >= r.end) {
        next.push(r); // sem overlap
        continue;
      }
      if (r.start < b.start) next.push({ start: r.start, end: b.start });
      if (b.end < r.end) next.push({ start: b.end, end: r.end });
    }
    current = next;
  }
  return current;
}

/** Junta ranges que se tocam ou se sobrepõem. Estabiliza output do intersect. */
function mergeOverlapping(ranges: Range[]): Range[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((x, y) => x.start.getTime() - y.start.getTime());
  const out: Range[] = [];
  for (const cur of sorted) {
    const prev = out[out.length - 1];
    if (prev && cur.start <= prev.end) {
      if (cur.end > prev.end) prev.end = cur.end;
    } else {
      out.push({ start: cur.start, end: cur.end });
    }
  }
  return out;
}
