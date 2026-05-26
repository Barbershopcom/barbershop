import { fromZonedTime } from 'date-fns-tz';

import {
  type BarberInput,
  intersect,
  SlotsService,
  type SlotsInput,
  subtract,
} from '../src/slots/slots.service';

const TZ = 'America/Sao_Paulo';

/**
 * Helper: cria instante UTC a partir de "YYYY-MM-DD HH:MM" no timezone.
 * Usado pelos testes pra montar fixtures legíveis.
 */
function atLocal(dateTime: string): Date {
  return fromZonedTime(`${dateTime}:00`, TZ);
}

/** Helper pra montar BarberInput sem repetir estrutura. */
function barber(
  partial: Partial<BarberInput> & { id: string; displayName: string },
): BarberInput {
  return {
    schedules: [],
    appointments: [],
    ...partial,
  };
}

describe('intersect()', () => {
  it('retorna vazio se ranges não se sobrepõem', () => {
    const a = [{ start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 10:00') }];
    const b = [{ start: atLocal('2026-05-26 11:00'), end: atLocal('2026-05-26 12:00') }];
    expect(intersect(a, b)).toEqual([]);
  });

  it('intersecta dois ranges com overlap parcial', () => {
    const a = [{ start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 12:00') }];
    const b = [{ start: atLocal('2026-05-26 10:00'), end: atLocal('2026-05-26 14:00') }];
    expect(intersect(a, b)).toEqual([
      { start: atLocal('2026-05-26 10:00'), end: atLocal('2026-05-26 12:00') },
    ]);
  });

  it('intersecta múltiplos ranges em cada lado', () => {
    // Shop: 9-12 e 14-18; Barbeiro: 10-16 → resultado: 10-12 e 14-16
    const shop = [
      { start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 12:00') },
      { start: atLocal('2026-05-26 14:00'), end: atLocal('2026-05-26 18:00') },
    ];
    const barberR = [{ start: atLocal('2026-05-26 10:00'), end: atLocal('2026-05-26 16:00') }];
    expect(intersect(shop, barberR)).toEqual([
      { start: atLocal('2026-05-26 10:00'), end: atLocal('2026-05-26 12:00') },
      { start: atLocal('2026-05-26 14:00'), end: atLocal('2026-05-26 16:00') },
    ]);
  });
});

describe('subtract()', () => {
  it('remove range inteiro contido', () => {
    const ranges = [{ start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 18:00') }];
    const blocked = [{ start: atLocal('2026-05-26 13:00'), end: atLocal('2026-05-26 14:00') }];
    const out = subtract(ranges, blocked);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      start: atLocal('2026-05-26 09:00'),
      end: atLocal('2026-05-26 13:00'),
    });
    expect(out[1]).toEqual({
      start: atLocal('2026-05-26 14:00'),
      end: atLocal('2026-05-26 18:00'),
    });
  });

  it('mantém range se blocked não toca', () => {
    const ranges = [{ start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 12:00') }];
    const blocked = [{ start: atLocal('2026-05-26 14:00'), end: atLocal('2026-05-26 15:00') }];
    expect(subtract(ranges, blocked)).toEqual(ranges);
  });

  it('remove apenas o início se blocked começa antes', () => {
    const ranges = [{ start: atLocal('2026-05-26 09:00'), end: atLocal('2026-05-26 12:00') }];
    const blocked = [{ start: atLocal('2026-05-26 08:00'), end: atLocal('2026-05-26 10:00') }];
    expect(subtract(ranges, blocked)).toEqual([
      { start: atLocal('2026-05-26 10:00'), end: atLocal('2026-05-26 12:00') },
    ]);
  });
});

describe('SlotsService.compute()', () => {
  const service = new SlotsService();
  // 2026-05-26 é uma terça-feira (weekday=2)
  const TUESDAY = '2026-05-26';
  const weekday = 2;

  // "Now" muito antes dos testes pra não cortar nada
  const nowFar = atLocal('2026-05-25 00:00');

  function baseInput(overrides: Partial<SlotsInput> = {}): SlotsInput {
    return {
      timezone: TZ,
      serviceDurationMin: 60,
      shopHours: [{ weekday, opensAt: '09:00', closesAt: '18:00' }],
      barbers: [
        barber({
          id: 'b1',
          displayName: 'João',
          schedules: [{ weekday, opensAt: '09:00', closesAt: '18:00' }],
        }),
      ],
      fromDate: TUESDAY,
      toDate: TUESDAY,
      now: nowFar,
      ...overrides,
    };
  }

  it('Caso 1: shop 9-18, barbeiro 9-18, sem appointments, 60min → 9 slots', () => {
    const out = service.compute(baseInput());
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-26 09:00'),
      atLocal('2026-05-26 10:00'),
      atLocal('2026-05-26 11:00'),
      atLocal('2026-05-26 12:00'),
      atLocal('2026-05-26 13:00'),
      atLocal('2026-05-26 14:00'),
      atLocal('2026-05-26 15:00'),
      atLocal('2026-05-26 16:00'),
      atLocal('2026-05-26 17:00'),
    ]);
  });

  it('Caso 2: shop 9-18, barbeiro 10-14, 60min → 4 slots', () => {
    const out = service.compute(
      baseInput({
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '10:00', closesAt: '14:00' }],
          }),
        ],
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-26 10:00'),
      atLocal('2026-05-26 11:00'),
      atLocal('2026-05-26 12:00'),
      atLocal('2026-05-26 13:00'),
    ]);
  });

  it('Caso 3: shop com intervalo 9-12 + 14-18, barbeiro 9-18, 60min → 7 slots', () => {
    const out = service.compute(
      baseInput({
        shopHours: [
          { weekday, opensAt: '09:00', closesAt: '12:00' },
          { weekday, opensAt: '14:00', closesAt: '18:00' },
        ],
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-26 09:00'),
      atLocal('2026-05-26 10:00'),
      atLocal('2026-05-26 11:00'),
      atLocal('2026-05-26 14:00'),
      atLocal('2026-05-26 15:00'),
      atLocal('2026-05-26 16:00'),
      atLocal('2026-05-26 17:00'),
    ]);
  });

  it('Caso 4: appointment 10-11 exclui slot das 10:00, mantém 9 e 11', () => {
    const out = service.compute(
      baseInput({
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '18:00' }],
            appointments: [
              {
                startAt: atLocal('2026-05-26 10:00'),
                endAt: atLocal('2026-05-26 11:00'),
              },
            ],
          }),
        ],
      }),
    );
    const times = out.map((s) => s.startAt);
    expect(times).toContainEqual(atLocal('2026-05-26 09:00'));
    expect(times).not.toContainEqual(atLocal('2026-05-26 10:00'));
    expect(times).toContainEqual(atLocal('2026-05-26 11:00'));
    expect(out).toHaveLength(8);
  });

  it('Caso 5: appointment 10:30-11:30 exclui slots 10 e 11', () => {
    const out = service.compute(
      baseInput({
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '18:00' }],
            appointments: [
              {
                startAt: atLocal('2026-05-26 10:30'),
                endAt: atLocal('2026-05-26 11:30'),
              },
            ],
          }),
        ],
      }),
    );
    const times = out.map((s) => s.startAt);
    // 9:00 termina às 10:00 — não overlap com 10:30, slot permitido
    expect(times).toContainEqual(atLocal('2026-05-26 09:00'));
    expect(times).not.toContainEqual(atLocal('2026-05-26 10:00'));
    expect(times).not.toContainEqual(atLocal('2026-05-26 11:00'));
    expect(times).toContainEqual(atLocal('2026-05-26 12:00'));
  });

  it('Caso 6: serviço 90min com shop 9-12 → 2 slots (9:00 e 10:30)', () => {
    const out = service.compute(
      baseInput({
        serviceDurationMin: 90,
        shopHours: [{ weekday, opensAt: '09:00', closesAt: '12:00' }],
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '12:00' }],
          }),
        ],
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-26 09:00'),
      atLocal('2026-05-26 10:30'),
    ]);
  });

  it('Caso 7: now=14:30, slots antes de 14:30 são cortados', () => {
    const out = service.compute(
      baseInput({
        now: atLocal('2026-05-26 14:30'),
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-26 15:00'),
      atLocal('2026-05-26 16:00'),
      atLocal('2026-05-26 17:00'),
    ]);
  });

  it('Caso 9: barbeiro sem schedule no dia → 0 slots', () => {
    const out = service.compute(
      baseInput({
        barbers: [barber({ id: 'b1', displayName: 'João', schedules: [] })],
      }),
    );
    expect(out).toEqual([]);
  });

  it('Caso 11: 2 barbeiros mesma janela → 2 slots por horário, ordenados', () => {
    const out = service.compute(
      baseInput({
        shopHours: [{ weekday, opensAt: '09:00', closesAt: '11:00' }],
        barbers: [
          barber({
            id: 'b2',
            displayName: 'Bruno',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '11:00' }],
          }),
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '11:00' }],
          }),
        ],
      }),
    );
    // 2 horários × 2 barbeiros = 4 slots, ordenados por (startAt, barberId)
    expect(out).toHaveLength(4);
    expect(out[0]).toMatchObject({ startAt: atLocal('2026-05-26 09:00'), barberId: 'b1' });
    expect(out[1]).toMatchObject({ startAt: atLocal('2026-05-26 09:00'), barberId: 'b2' });
    expect(out[2]).toMatchObject({ startAt: atLocal('2026-05-26 10:00'), barberId: 'b1' });
    expect(out[3]).toMatchObject({ startAt: atLocal('2026-05-26 10:00'), barberId: 'b2' });
  });

  it('multi-dia: from=quarta to=sexta, sem schedule quarta → só quinta+sexta', () => {
    // 2026-05-27 = quarta (weekday=3), 28=quinta (4), 29=sexta (5)
    const out = service.compute(
      baseInput({
        fromDate: '2026-05-27',
        toDate: '2026-05-29',
        shopHours: [
          { weekday: 3, opensAt: '09:00', closesAt: '10:00' },
          { weekday: 4, opensAt: '09:00', closesAt: '10:00' },
          { weekday: 5, opensAt: '09:00', closesAt: '10:00' },
        ],
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            // Só trabalha quinta e sexta
            schedules: [
              { weekday: 4, opensAt: '09:00', closesAt: '10:00' },
              { weekday: 5, opensAt: '09:00', closesAt: '10:00' },
            ],
          }),
        ],
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([
      atLocal('2026-05-28 09:00'),
      atLocal('2026-05-29 09:00'),
    ]);
  });

  it('slot que não cabe inteiro no range é descartado', () => {
    // Range 9-10:30 com serviço 60min → só 1 slot (9:00 termina 10:00 ok).
    // 10:00 + 60min = 11:00 > 10:30, descartado.
    const out = service.compute(
      baseInput({
        shopHours: [{ weekday, opensAt: '09:00', closesAt: '10:30' }],
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '10:30' }],
          }),
        ],
      }),
    );
    expect(out.map((s) => s.startAt)).toEqual([atLocal('2026-05-26 09:00')]);
  });

  it('buffer 15min: appt 10-11 com buffer empurra próximo slot pra >= 11:15', () => {
    // Shop+barbeiro 9-18, serviço 60min com buffer 15.
    // Appt 10-11 bloqueia [10, 11:15]. Slot 11:00 (até 12:00) overlap com buffer → excluído.
    // Slot 9:00 (até 10:00) overlap com appt em [10, 10] → 10 < 10 é falso, OK?
    //   slotEnd=10:00, slotEnd+buffer = 10:15; aStart=10 < 10:15 ✓; aEnd+buffer = 11:15 > cursor=9 ✓ → OVERLAP.
    // Então slot 9:00 também é excluído pois apt+buffer prévio toca slot+buffer próximo (errado?).
    // Re-pensando: aStart < slotEnd + bufferMs E aEnd + bufferMs > cursor
    // slot 9:00: cursor=9, slotEnd=10. aStart=10 < 10+0.25h=10:15 ✓; aEnd+buf=11:15 > 9 ✓ → OVERLAP.
    // Hmm. Isso quebra o slot 9:00 que devia ser válido (termina exatamente quando appt começa).
    // O buffer pré-appt não deveria empurrar o slot ANTES do appt. Mas a fórmula simétrica empurra.
    // Decisão pragmática: aplicar buffer só DEPOIS (regra que casa com UX "barbeiro precisa de 15 min pra limpar").
    // Vou validar essa decisão aqui — slot 9:00 deve PASSAR.
    const out = service.compute(
      baseInput({
        serviceBufferMin: 15,
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '18:00' }],
            appointments: [
              {
                startAt: atLocal('2026-05-26 10:00'),
                endAt: atLocal('2026-05-26 11:00'),
              },
            ],
          }),
        ],
      }),
    );
    const times = out.map((s) => s.startAt);
    // 9:00 ainda válido (termina 10:00, exatamente quando appt começa)
    expect(times).toContainEqual(atLocal('2026-05-26 09:00'));
    // 10:00 e 11:00 excluídos (10:00 overlap direto; 11:00 termina dentro do buffer 11:00-11:15)
    expect(times).not.toContainEqual(atLocal('2026-05-26 10:00'));
    expect(times).not.toContainEqual(atLocal('2026-05-26 11:00'));
    // 12:00 ok (>= 11:15)
    expect(times).toContainEqual(atLocal('2026-05-26 12:00'));
  });

  it('appointment fora do range working não interfere', () => {
    // Working 9-12, appointment 14-15 → todos os slots de 9-11 disponíveis
    const out = service.compute(
      baseInput({
        shopHours: [{ weekday, opensAt: '09:00', closesAt: '12:00' }],
        barbers: [
          barber({
            id: 'b1',
            displayName: 'João',
            schedules: [{ weekday, opensAt: '09:00', closesAt: '12:00' }],
            appointments: [
              {
                startAt: atLocal('2026-05-26 14:00'),
                endAt: atLocal('2026-05-26 15:00'),
              },
            ],
          }),
        ],
      }),
    );
    expect(out).toHaveLength(3); // 9, 10, 11
  });
});
