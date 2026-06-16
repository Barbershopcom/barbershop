import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  type AdminCreateAppointmentInput,
  type BookAppointmentInput,
  type BookedAppointment,
  couponReasonLabel,
  slotOccupyingStatuses,
} from '@barbearia/schemas';

import { CouponsService } from '../coupons/coupons.service';
import { EmailService } from '../email/email.service';
import { formatPriceBRL, tenantContactVars } from '../email/format';
import { JobsService } from '../jobs/jobs.service';
import { APPOINTMENT_REMINDER_QUEUE, type ReminderPayload } from '../jobs/jobs-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { encodeCancelToken } from './cancel-token';
import { dateEndExclusiveUtc, dateStartUtc, SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

/**
 * Booking público: cria appointment validando slot + idempotência.
 *
 * Fluxo:
 *   1) Idempotency check  → se key já existe, retorna cache (200 ou 201).
 *   2) Resolve tenant+service+barber. 404 se algum não bater.
 *   3) Revalida slot     → roda SlotsService com janela mínima.
 *   4) INSERT appointment com status='awaiting_payment' (ou 'confirmed' se admin).
 *      EXCLUDE constraint protege contra race condition entre 3 e 4.
 *   5) Cache response em idempotency_keys.
 *
 * Bypassa RLS pelo mesmo motivo dos slots (ADR-004 §5).
 */
@Injectable()
export class BookingService {
  private static readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SlotsRepository,
    private readonly slots: SlotsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly jobs: JobsService,
    @Inject(forwardRef(() => CouponsService))
    private readonly coupons: CouponsService,
  ) {}

  async book(args: {
    slug: string;
    idempotencyKey: string;
    body: BookAppointmentInput;
  }): Promise<{ status: number; body: BookedAppointment | Record<string, unknown> }> {
    const { slug, idempotencyKey, body } = args;

    const tenant = await this.repo.resolveTenant(slug);
    const service = await this.repo.resolveActiveService(tenant.id, body.serviceId);

    const requestHash = hashRequest(body);

    // 1. Idempotency check
    const cached = await this.prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
      select: { tenantId: true, requestHash: true, responseStatus: true, responseBody: true },
    });
    if (cached) {
      if (cached.tenantId !== tenant.id || cached.requestHash !== requestHash) {
        throw new UnprocessableEntityException({
          message: 'Idempotency-Key conflicting with different request.',
          code: 'idempotency_mismatch',
        });
      }
      return {
        status: cached.responseStatus,
        body: cached.responseBody as Record<string, unknown>,
      };
    }

    // 2. Resolve barbeiro + verifica capability
    const barberWithCap = await this.prisma.employee.findFirst({
      where: {
        id: body.barberId,
        tenantId: tenant.id,
        barbershopId: service.barbershopId,
        isActive: true,
        capabilities: { some: { serviceId: service.id } },
      },
      select: { id: true, displayName: true },
    });
    if (!barberWithCap) {
      throw new UnprocessableEntityException({
        message: 'Barbeiro não atende esse serviço ou está inativo.',
        code: 'invalid_barber',
      });
    }

    // 3. Revalida slot: janela mínima = só esse dia (no timezone do tenant)
    const startAtUtc = new Date(body.startAt);
    if (Number.isNaN(startAtUtc.getTime())) {
      throw new BadRequestException('`startAt` inválido.');
    }
    const endAtUtc = new Date(startAtUtc.getTime() + service.durationMin * 60_000);

    // Detecta o YYYY-MM-DD do startAt no timezone do tenant pra rodar slots
    const dateInTz = formatDateInTz(startAtUtc, tenant.timezone);

    const fromDateUtc = dateStartUtc(dateInTz, tenant.timezone);
    const toDateUtcExclusive = dateEndExclusiveUtc(dateInTz, tenant.timezone);

    const { shopHours, barbers } = await this.repo.loadSlotInputs({
      tenantId: tenant.id,
      barbershopId: service.barbershopId,
      serviceId: service.id,
      barberId: body.barberId,
      fromDateUtc,
      toDateUtcExclusive,
    });

    const available = this.slots.compute({
      timezone: tenant.timezone,
      serviceDurationMin: service.durationMin,
      serviceBufferMin: service.bufferMin,
      shopHours,
      barbers,
      fromDate: dateInTz,
      toDate: dateInTz,
      now: new Date(),
    });

    const slotMatch = available.find(
      (s) => s.startAt.getTime() === startAtUtc.getTime() && s.barberId === body.barberId,
    );
    if (!slotMatch) {
      throw new UnprocessableEntityException({
        message: 'Horário indisponível.',
        code: 'slot_unavailable',
      });
    }

    // 3.5. Cupom (ADR-021 §4). Reserva ANTES de criar (guard atômico);
    //      libera a reserva se a criação falhar. priceCents já sai com desconto.
    let priceCents = service.basePriceCents;
    let reservedCoupon: { id: string; discountCents: number } | null = null;
    if (body.couponCode) {
      const couponValidation = await this.coupons.validateByCode(
        tenant.id,
        body.couponCode,
        service.basePriceCents,
        new Date(),
      );
      if (!couponValidation.valid || couponValidation.couponId === undefined) {
        throw new UnprocessableEntityException({
          message: couponReasonLabel(couponValidation.reason ?? 'not_found'),
          code: 'coupon_invalid',
          reason: couponValidation.reason ?? 'not_found',
        });
      }
      const reserved = await this.coupons.tryReserve(couponValidation.couponId);
      if (!reserved) {
        throw new UnprocessableEntityException({
          message: couponReasonLabel('exhausted'),
          code: 'coupon_invalid',
          reason: 'exhausted',
        });
      }
      priceCents = v.finalPriceCents ?? service.basePriceCents;
      reservedCoupon = { id: v.couponId, discountCents: v.discountCents ?? 0 };
    }

    // 4. INSERT atômico. EXCLUDE constraint pega race condition.
    let created;
    try {
      created = await this.prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          barbershopId: service.barbershopId,
          barberId: body.barberId,
          serviceId: service.id,
          customerName: body.customerName.trim(),
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail ?? null,
          startAt: startAtUtc,
          endAt: endAtUtc,
          // Booking público nasce aguardando pagamento (ADR-016 §3).
          // PaymentService move pra 'pending' ao aprovar.
          status: 'awaiting_payment',
          priceCents,
        },
      });
    } catch (err) {
      // Criação falhou: devolve a reserva do cupom pra não vazar resgate.
      if (reservedCoupon) await this.coupons.releaseReservation(reservedCoupon.id);
      if (
        err instanceof Prisma.PrismaClientUnknownRequestError ||
        err instanceof Prisma.PrismaClientKnownRequestError
      ) {
        const sqlState = extractSqlState(err);
        if (sqlState === '23P01') {
          BookingService.logger.warn(
            `EXCLUDE constraint disparou em booking — race condition resolvida (slot já ocupado). barber=${body.barberId} start=${body.startAt}`,
          );
          throw new ConflictException({
            message: 'Esse horário acabou de ser reservado por outro cliente.',
            code: 'slot_taken',
          });
        }
      }
      throw err;
    }

    // Registra o resgate do cupom (appointment_id unique blinda replay).
    if (reservedCoupon) {
      await this.coupons.recordRedemption({
        tenantId: tenant.id,
        couponId: reservedCoupon.id,
        appointmentId: created.id,
        customerEmail: body.customerEmail ?? null,
        discountCents: reservedCoupon.discountCents,
      });
    }

    const response: BookedAppointment = {
      id: created.id,
      serviceId: created.serviceId,
      barberId: created.barberId,
      startAt: created.startAt.toISOString(),
      endAt: created.endAt.toISOString(),
      status: created.status as BookedAppointment['status'],
      priceCents: created.priceCents,
      customerName: created.customerName,
      customerPhone: created.customerPhone ?? body.customerPhone,
      customerEmail: created.customerEmail,
    };

    // 4.5. Upsert device pro Expo Push (ADR-010 §5/§8). Best-effort.
    if (body.expoPushToken) {
      void this.upsertCustomerDevice({
        expoPushToken: body.expoPushToken,
        customerPhone: body.customerPhone,
      });
    }

    // 5. Cache idempotency. ON CONFLICT DO NOTHING blinda contra race com retry.
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          tenantId: tenant.id,
          requestHash,
          responseStatus: 201,
          responseBody: response as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Se duplicate key — request paralela com mesma key acabou de criar.
      // Não é erro pra cliente; o appointment já está salvo.
      BookingService.logger.debug(
        `IdempotencyKey race condition (key=${idempotencyKey}): ${err instanceof Error ? err.message : err}`,
      );
    }

    // 6. Booking público nasce 'awaiting_payment' (ADR-016 §3): NÃO manda
    //    email de confirmação aqui — isso era prematuro (avisava "confirmado"
    //    antes do pagamento). O email pós-pagamento ("pagamento recebido /
    //    aguardando confirmação") sai no PaymentService.markPaid/pay, e o
    //    "agendamento confirmado" quando o barbeiro aceita (AppointmentNotifier).

    // 7. Agenda reminder pra 24h antes (ADR-007 §3).
    //    Skip se appt for em menos de 24h (reminder não faz sentido).
    void this.scheduleReminder({
      apptId: created.id,
      startAt: startAtUtc,
    });

    return { status: 201, body: response };
  }

  /**
   * Admin manual booking — sem idempotency, telefone opcional, sem throttle.
   * Tenant resolvido via JWT (passado pelo caller). Revalida slot + EXCLUDE
   * constraint igual ao público. Email + reminder iguais.
   */
  async bookAsAdmin(args: {
    tenantId: string;
    body: AdminCreateAppointmentInput;
  }): Promise<BookedAppointment> {
    const { tenantId, body } = args;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    if (!tenant) {
      throw new UnprocessableEntityException({
        message: 'Tenant não encontrado.',
        code: 'invalid_tenant',
      });
    }

    const service = await this.repo.resolveActiveService(tenant.id, body.serviceId);

    const barberWithCap = await this.prisma.employee.findFirst({
      where: {
        id: body.barberId,
        tenantId: tenant.id,
        barbershopId: service.barbershopId,
        isActive: true,
        capabilities: { some: { serviceId: service.id } },
      },
      select: { id: true, displayName: true },
    });
    if (!barberWithCap) {
      throw new UnprocessableEntityException({
        message: 'Barbeiro não atende esse serviço ou está inativo.',
        code: 'invalid_barber',
      });
    }

    const startAtUtc = new Date(body.startAt);
    if (Number.isNaN(startAtUtc.getTime())) {
      throw new BadRequestException('`startAt` inválido.');
    }
    const endAtUtc = new Date(startAtUtc.getTime() + service.durationMin * 60_000);

    // Revalida via SlotsService
    const dateInTz = formatDateInTz(startAtUtc, tenant.timezone);
    const fromDateUtc = dateStartUtc(dateInTz, tenant.timezone);
    const toDateUtcExclusive = dateEndExclusiveUtc(dateInTz, tenant.timezone);
    const { shopHours, barbers } = await this.repo.loadSlotInputs({
      tenantId: tenant.id,
      barbershopId: service.barbershopId,
      serviceId: service.id,
      barberId: body.barberId,
      fromDateUtc,
      toDateUtcExclusive,
    });
    const available = this.slots.compute({
      timezone: tenant.timezone,
      serviceDurationMin: service.durationMin,
      serviceBufferMin: service.bufferMin,
      shopHours,
      barbers,
      fromDate: dateInTz,
      toDate: dateInTz,
      now: new Date(),
    });
    const slotMatch = available.find(
      (s) => s.startAt.getTime() === startAtUtc.getTime() && s.barberId === body.barberId,
    );
    if (!slotMatch) {
      throw new UnprocessableEntityException({
        message: 'Horário indisponível.',
        code: 'slot_unavailable',
      });
    }

    let created;
    try {
      created = await this.prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          barbershopId: service.barbershopId,
          barberId: body.barberId,
          serviceId: service.id,
          customerName: body.customerName.trim(),
          customerPhone: body.customerPhone ?? null,
          customerEmail: body.customerEmail ?? null,
          startAt: startAtUtc,
          endAt: endAtUtc,
          // Admin marca presencial/telefone — não passa por pagamento online,
          // nasce confirmado direto (ADR-016 §3).
          status: 'confirmed',
          priceCents: service.basePriceCents,
        },
      });
    } catch (err) {
      const sqlState = extractSqlState(err);
      if (sqlState === '23P01') {
        throw new ConflictException({
          message: 'Esse horário acabou de ser reservado.',
          code: 'slot_taken',
        });
      }
      throw err;
    }

    const response: BookedAppointment = {
      id: created.id,
      serviceId: created.serviceId,
      barberId: created.barberId,
      startAt: created.startAt.toISOString(),
      endAt: created.endAt.toISOString(),
      status: created.status as BookedAppointment['status'],
      priceCents: created.priceCents,
      customerName: created.customerName,
      customerPhone: created.customerPhone ?? body.customerPhone ?? null,
      customerEmail: created.customerEmail,
    };

    if (body.customerEmail) {
      void this.sendConfirmationEmail({
        to: body.customerEmail,
        appointmentId: created.id,
        startAt: startAtUtc,
        endAt: endAtUtc,
        customerName: body.customerName.trim(),
        tenant,
        serviceName: service.name,
        serviceDurationMin: service.durationMin,
        servicePriceCents: service.basePriceCents,
        barberName: barberWithCap.displayName,
      });
    }

    void this.scheduleReminder({
      apptId: created.id,
      startAt: startAtUtc,
    });

    return response;
  }

  /**
   * Reschedule: muda startAt/endAt de um appointment booked.
   * Revalida slot + EXCLUDE constraint pega race. Dispara email
   * "remarcado" pro cliente com link de cancel novo.
   */
  async reschedule(args: {
    appointmentId: string;
    newStartAtIso: string;
  }): Promise<{ id: string; oldStartAt: Date; newStartAt: Date; newEndAt: Date }> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: args.appointmentId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        barberId: true,
        serviceId: true,
        barbershopId: true,
        tenantId: true,
        customerName: true,
        customerEmail: true,
      },
    });
    if (!appt) {
      throw new BookingRescheduleError('not_found', 'Appointment não encontrado.');
    }
    if (!slotOccupyingStatuses.includes(appt.status as any)) {
      throw new BookingRescheduleError(
        'invalid_status',
        `Só é possível remarcar appointment ocupando slot, estado atual: '${appt.status}'.`,
      );
    }

    const newStartAt = new Date(args.newStartAtIso);
    if (Number.isNaN(newStartAt.getTime())) {
      throw new BookingRescheduleError('invalid_input', '`newStartAt` inválido.');
    }
    // No-op se o novo horário for igual ao atual
    if (newStartAt.getTime() === appt.startAt.getTime()) {
      return {
        id: appt.id,
        oldStartAt: appt.startAt,
        newStartAt: appt.startAt,
        newEndAt: appt.endAt,
      };
    }

    // Carrega dados frescos pra revalidação
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    const service = await this.prisma.service.findUnique({
      where: { id: appt.serviceId },
      select: {
        id: true,
        durationMin: true,
        bufferMin: true,
        name: true,
        basePriceCents: true,
      },
    });
    const barber = await this.prisma.employee.findUnique({
      where: { id: appt.barberId },
      select: { id: true, displayName: true, isActive: true },
    });
    if (!tenant || !service || !barber || !barber.isActive) {
      throw new BookingRescheduleError('invalid_input', 'Dados inválidos pro reschedule.');
    }

    const newEndAt = new Date(newStartAt.getTime() + service.durationMin * 60_000);
    const dateInTz = formatDateInTz(newStartAt, tenant.timezone);
    const fromDateUtc = dateStartUtc(dateInTz, tenant.timezone);
    const toDateUtcExclusive = dateEndExclusiveUtc(dateInTz, tenant.timezone);

    const { shopHours, barbers } = await this.repo.loadSlotInputs({
      tenantId: tenant.id,
      barbershopId: appt.barbershopId,
      serviceId: service.id,
      barberId: appt.barberId,
      fromDateUtc,
      toDateUtcExclusive,
    });

    // Revalidação: o slot novo precisa estar disponível, MAS excluindo
    // o próprio appointment que está sendo reschedulado (senão ele
    // "conflita consigo mesmo" na lista de bookings).
    const barbersForCheck = barbers.map((b) =>
      b.id === appt.barberId
        ? {
            ...b,
            appointments: b.appointments.filter(
              (a) =>
                a.startAt.getTime() !== appt.startAt.getTime() ||
                a.endAt.getTime() !== appt.endAt.getTime(),
            ),
          }
        : b,
    );

    const available = this.slots.compute({
      timezone: tenant.timezone,
      serviceDurationMin: service.durationMin,
      serviceBufferMin: service.bufferMin,
      shopHours,
      barbers: barbersForCheck,
      fromDate: dateInTz,
      toDate: dateInTz,
      now: new Date(),
    });

    const match = available.find(
      (s) => s.startAt.getTime() === newStartAt.getTime() && s.barberId === appt.barberId,
    );
    if (!match) {
      throw new BookingRescheduleError('slot_unavailable', 'Horário novo indisponível.');
    }

    // UPDATE atômico. EXCLUDE constraint pega race se outra request reservou.
    try {
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { startAt: newStartAt, endAt: newEndAt },
      });
    } catch (err) {
      const sqlState = extractSqlState(err);
      if (sqlState === '23P01') {
        throw new BookingRescheduleError(
          'slot_taken',
          'Esse horário acabou de ser reservado por outro.',
        );
      }
      throw err;
    }

    // Email de remarcação com token regenerado
    if (appt.customerEmail) {
      void this.sendRescheduleEmail({
        to: appt.customerEmail,
        appointmentId: appt.id,
        oldStartAt: appt.startAt,
        newStartAt,
        customerName: appt.customerName,
        tenant,
        serviceName: service.name,
        serviceDurationMin: service.durationMin,
        servicePriceCents: service.basePriceCents,
        barberName: barber.displayName,
      });
    }

    return {
      id: appt.id,
      oldStartAt: appt.startAt,
      newStartAt,
      newEndAt,
    };
  }

  private async sendRescheduleEmail(args: {
    to: string;
    appointmentId: string;
    oldStartAt: Date;
    newStartAt: Date;
    customerName: string;
    tenant: {
      name: string;
      timezone: string;
      phoneE164?: string | null;
      addressLine?: string | null;
      instagramHandle?: string | null;
    };
    serviceName: string;
    serviceDurationMin: number;
    servicePriceCents: number;
    barberName: string;
  }): Promise<void> {
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET');
    const webUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'http://localhost:3000';
    let cancelUrl: string | undefined;
    if (secret) {
      const token = encodeCancelToken(
        { apptId: args.appointmentId, exp: Math.floor(args.newStartAt.getTime() / 1000) },
        secret,
      );
      cancelUrl = `${webUrl}/cancel/${token}`;
    }

    await this.email.sendBookingRescheduled({
      to: args.to,
      vars: {
        tenantName: args.tenant.name,
        customerName: args.customerName,
        previousDateLabel: formatDate(args.oldStartAt, args.tenant.timezone),
        previousTimeLabel: formatTime(args.oldStartAt, args.tenant.timezone),
        dateLabel: formatDate(args.newStartAt, args.tenant.timezone),
        timeLabel: formatTime(args.newStartAt, args.tenant.timezone),
        durationLabel: formatDuration(args.serviceDurationMin),
        serviceName: args.serviceName,
        barberName: args.barberName,
        priceLabel: formatPriceBRL(args.servicePriceCents),
        cancelUrl,
        ...tenantContactVars(args.tenant),
      },
    });
  }

  private async scheduleReminder(args: {
    apptId: string;
    startAt: Date;
  }): Promise<void> {
    const reminderAt = new Date(args.startAt.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    if (reminderAt <= now) {
      BookingService.logger.debug(
        `Reminder skip: appointment ${args.apptId} é em < 24h (startAt=${args.startAt.toISOString()})`,
      );
      return;
    }
    try {
      const payload: ReminderPayload = { apptId: args.apptId };
      await this.jobs.send(APPOINTMENT_REMINDER_QUEUE, payload, {
        startAfter: reminderAt,
        retryLimit: 3,
        retryBackoff: true,
      });
    } catch (err) {
      // Não trava booking — log e segue. Cliente já recebeu confirmação.
      BookingService.logger.warn(
        `Falha ao agendar reminder pra ${args.apptId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Upsert via SQL raw (sem Prisma client model — ADR-010 §8). Usa
   * ON CONFLICT do expo_push_token pra atualizar last_seen_at + telefone
   * se o cliente trocar de número mantendo o device.
   */
  private async upsertCustomerDevice(args: {
    expoPushToken: string;
    customerPhone: string;
  }): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO customer_devices (expo_push_token, customer_phone, last_seen_at)
        VALUES (${args.expoPushToken}, ${args.customerPhone}, NOW())
        ON CONFLICT (expo_push_token)
        DO UPDATE SET customer_phone = EXCLUDED.customer_phone, last_seen_at = NOW()
      `;
    } catch (err) {
      BookingService.logger.warn(
        `Falha ao upsertar customer_device: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async sendConfirmationEmail(args: {
    to: string;
    appointmentId: string;
    startAt: Date;
    endAt: Date;
    customerName: string;
    tenant: {
      name: string;
      timezone: string;
      phoneE164?: string | null;
      addressLine?: string | null;
      instagramHandle?: string | null;
    };
    serviceName: string;
    serviceDurationMin: number;
    servicePriceCents: number;
    barberName: string;
  }): Promise<void> {
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET');
    const webUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'http://localhost:3000';
    let cancelUrl: string | undefined;
    if (secret) {
      const token = encodeCancelToken(
        { apptId: args.appointmentId, exp: Math.floor(args.startAt.getTime() / 1000) },
        secret,
      );
      cancelUrl = `${webUrl}/cancel/${token}`;
    }

    await this.email.sendBookingConfirmation({
      to: args.to,
      vars: {
        tenantName: args.tenant.name,
        customerName: args.customerName,
        dateLabel: formatDate(args.startAt, args.tenant.timezone),
        timeLabel: formatTime(args.startAt, args.tenant.timezone),
        durationLabel: formatDuration(args.serviceDurationMin),
        serviceName: args.serviceName,
        barberName: args.barberName,
        priceLabel: formatPriceBRL(args.servicePriceCents),
        cancelUrl,
        ...tenantContactVars(args.tenant),
      },
    });
  }
}

function formatDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/**
 * Erro de domínio do reschedule. Controller mapeia pra HTTP code apropriado.
 */
export class BookingRescheduleError extends Error {
  constructor(
    public readonly code:
      | 'not_found'
      | 'invalid_status'
      | 'invalid_input'
      | 'slot_unavailable'
      | 'slot_taken',
    message: string,
  ) {
    super(message);
    this.name = 'BookingRescheduleError';
  }
}

function hashRequest(body: BookAppointmentInput): string {
  // Normaliza campos pra hash não variar com whitespace/case que o backend ignora.
  const normalized = JSON.stringify({
    serviceId: body.serviceId,
    barberId: body.barberId,
    startAt: body.startAt,
    customerName: body.customerName.trim(),
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail?.toLowerCase() ?? null,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

function extractSqlState(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'meta' in err) {
    const meta = (err as { meta?: { code?: string } }).meta;
    if (meta?.code) return meta.code;
  }
  // PrismaClientKnownRequestError pode ter .code (Prisma code), não SQLSTATE.
  // PrismaClientUnknownRequestError vem com message contendo "violates exclusion constraint"
  if (err instanceof Error && err.message.includes('exclusion constraint')) {
    return '23P01';
  }
  return undefined;
}

/** Formata `date` como YYYY-MM-DD no timezone informado. */
function formatDateInTz(date: Date, tz: string): string {
  // Intl.DateTimeFormat com timeZone retorna a data nesse fuso.
  // sv-SE locale dá YYYY-MM-DD nativo.
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
