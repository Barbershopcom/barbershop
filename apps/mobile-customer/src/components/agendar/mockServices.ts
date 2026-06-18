import type { Service } from '../../types';

export const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Corte clássico',
    durationMin: 30,
    price: 50,
    barbers: [
      { id: 'b1', initials: 'JJ', colorIndex: 0 },
      { id: 'b2', initials: 'RF', colorIndex: 1 },
    ],
  },
  {
    id: 's2',
    name: 'Corte + Barba',
    durationMin: 50,
    price: 80,
    discountPct: 20,
    barbers: [{ id: 'b1', initials: 'JJ', colorIndex: 0 }],
  },
  {
    id: 's3',
    name: 'Barba terapia',
    durationMin: 20,
    price: 30,
    barbers: [
      { id: 'b1', initials: 'JJ', colorIndex: 0 },
      { id: 'b3', initials: 'CA', colorIndex: 2 },
    ],
  },
  {
    id: 's4',
    name: 'Pezinho / acabamento',
    durationMin: 15,
    price: 20,
    barbers: [
      { id: 'b1', initials: 'JJ', colorIndex: 0 },
      { id: 'b2', initials: 'RF', colorIndex: 1 },
      { id: 'b3', initials: 'CA', colorIndex: 2 },
    ],
  },
  {
    id: 's5',
    name: 'Sobrancelha',
    durationMin: 10,
    price: 15,
    barbers: [{ id: 'b3', initials: 'CA', colorIndex: 2 }],
  },
];
