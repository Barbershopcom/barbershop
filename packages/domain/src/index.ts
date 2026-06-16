// Public surface of @barbearia/domain — regras de negócio puras.
// Sem dependência de framework, banco ou rede. Testável em isolamento.

// === TYPES ===

export interface PriceBreakdown {
  /** Preço base do serviço em centavos */
  basePriceCents: number;
  /** Desconto de cupom em centavos (negativo = desconto) */
  discountCents: number;
  /** Taxa do método de pagamento em centavos */
  methodFeeCents: number;
  /** Total final que o cliente paga em centavos */
  totalCents: number;
}

export interface ServiceDuration {
  durationMin: number;
  bufferMin: number;
}

export interface TimeRange {
  startMs: number; // epoch milliseconds
  endMs: number;
}

export interface Slot {
  startMs: number;
  durationMs: number;
}

// === APPOINTMENT STATE MACHINE ===

export type AppointmentStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show';

export interface AppointmentTransition {
  from: AppointmentStatus;
  to: AppointmentStatus;
  actor: 'system' | 'barber' | 'customer' | 'admin';
  reason?: string;
}

// === PRICE CALCULATION ===

/**
 * Calcula breakdown de preço: base + desconto + taxa.
 * Lógica pura, sem estado.
 */
export function computePriceBreakdown(options: {
  basePriceCents: number;
  discountCents?: number;
  methodFeePercentBps?: number; // basis points (100 bps = 1%)
  methodFeeFixedCents?: number;
}): PriceBreakdown {
  const { basePriceCents, discountCents = 0, methodFeePercentBps = 0, methodFeeFixedCents = 0 } = options;

  const afterDiscount = Math.max(0, basePriceCents + discountCents); // desconto pode ser negativo (< 0)
  const methodFee = Math.ceil((afterDiscount * methodFeePercentBps) / 10000) + methodFeeFixedCents;

  return {
    basePriceCents,
    discountCents,
    methodFeeCents: methodFee,
    totalCents: afterDiscount + methodFee,
  };
}

// === SLOT COMPUTATION (STUB) ===

/**
 * Computa slots disponíveis para um barbeiro em um dia.
 * Stub da implementação completa em `apps/api/src/slots/slots.service.ts`.
 *
 * Entrada:
 *   - shop hours (ex: 09:00-18:00)
 *   - barber schedule (ex: seg-sex 09:00-17:00)
 *   - appointments existentes (booked, pending, confirmed)
 *   - timeoff (férias, folga)
 *   - service duration (ex: 30min) + buffer (ex: 5min limpeza)
 *
 * Saída:
 *   - List de slots disponíveis (ex: [09:00-09:30, 09:35-10:05, ...])
 *
 * TODO Sprint 2: implementação em `packages/domain/src/slots.ts`
 */
export interface ComputeSlotsInput {
  shopHoursRange: TimeRange; // horário da barbearia no dia
  barberScheduleRanges: TimeRange[]; // múltiplas faixas (pausas para almoço)
  occupiedRanges: TimeRange[]; // appointments já booked/pending/confirmed
  timeOffRanges: TimeRange[]; // férias/folgas
  serviceDuration: ServiceDuration;
  nowMs: number; // "agora" (testabilidade)
  timezone: string; // "America/Sao_Paulo"
}

export interface ComputeSlotsOutput {
  slots: Slot[];
}

/**
 * STUB: computeSlots sera' implementado em Sprint 2.
 * Hoje implementado em apps/api/src/slots/slots.service.ts (migrar para aqui).
 */
export function computeSlots(_input: ComputeSlotsInput): ComputeSlotsOutput {
  throw new Error(
    'computeSlots não implementado. Ver apps/api/src/slots/slots.service.ts e migrar para packages/domain.',
  );
}

// === VALIDATION ===

/**
 * Valida se um appointment time está no futuro e não é muito longe.
 */
export function isValidBookingTime(options: {
  startMs: number;
  nowMs: number;
  maxDaysAhead?: number;
}): boolean {
  const { startMs, nowMs, maxDaysAhead = 365 } = options;

  // Deve estar no futuro
  if (startMs <= nowMs) return false;

  // Não pode ser > 365 dias no futuro
  const maxMs = nowMs + maxDaysAhead * 24 * 60 * 60 * 1000;
  if (startMs > maxMs) return false;

  return true;
}

/**
 * Valida se um cancelamento está dentro da janela permitida.
 * Regra: só pode cancelar até 24h antes do appointment.
 */
export function canCancelAppointment(options: {
  appointmentStartMs: number;
  nowMs: number;
  cancelWindowHours?: number;
}): boolean {
  const { appointmentStartMs, nowMs, cancelWindowHours = 24 } = options;

  const cancellationDeadlineMs = appointmentStartMs - cancelWindowHours * 60 * 60 * 1000;
  return nowMs <= cancellationDeadlineMs;
}

// === STATE MACHINE ===

/**
 * Valida transição de status de appointment.
 * Retorna true se a transição é permitida.
 */
export function isValidTransition(transition: AppointmentTransition): boolean {
  const { from, to, actor } = transition;

  // Transições válidas por ator
  const validTransitions: Record<string, Set<AppointmentStatus>> = {
    // Barbeiro confirma pendente
    'barber:pending': new Set(['confirmed']),
    // Barbeiro recusa pendente
    'barber:pending-reject': new Set(['cancelled']),
    // Barbeiro marca como completo
    'barber:confirmed': new Set(['completed']),
    // Barbeiro marca como falta
    'barber:confirmed-noshow': new Set(['no_show']),
    // Cliente cancela
    'customer:awaiting_payment': new Set(['cancelled']),
    'customer:pending': new Set(['cancelled']),
    'customer:confirmed': new Set(['cancelled']),
    // Sistema expira pendente
    'system:pending': new Set(['expired']),
    // Admin cancela (qualquer estado que ocupe slot)
    'admin:awaiting_payment': new Set(['cancelled']),
    'admin:pending': new Set(['cancelled']),
    'admin:confirmed': new Set(['cancelled']),
  };

  const key = `${actor}:${from}`;
  const allowed = validTransitions[key];
  return allowed?.has(to) ?? false;
}
