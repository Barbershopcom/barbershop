export type Barber = { id: string; initials: string; colorIndex: number };

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number; // preço cheio (em R$)
  discountPct?: number; // ex.: 20 → -20%
  barbers: Barber[]; // quem faz esse serviço
};
