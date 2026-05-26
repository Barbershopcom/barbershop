import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { BookAppointmentInput, BookedAppointment } from '@barbearia/schemas';

import { EmailService } from '../email/email.service';
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
 *   4) INSERT appointment com status='booked'.
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
          status: 'booked',
        },
      });
    } catch (err) {
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

    const response: BookedAppointment = {
      id: created.id,
      serviceId: created.serviceId,
      barberId: created.barberId,
      startAt: created.startAt.toISOString(),
      endAt: created.endAt.toISOString(),
      status: 'booked',
      customerName: created.customerName,
      customerPhone: created.customerPhone ?? body.customerPhone,
      customerEmail: created.customerEmail,
    };

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

    // 6. Email de confirmação (best-effort, não trava response).
    //    Se cliente não informou email, pula. Se Resend falhar, log e segue.
    if (body.customerEmail) {
      void this.sendConfirmationEmail({
        to: body.customerEmail,
        appointmentId: created.id,
        startAt: startAtUtc,
        endAt: endAtUtc,
        customerName: body.customerName.trim(),
        tenantName: tenant.name,
        tenantTimezone: tenant.timezone,
        serviceName: service.name,
        serviceDurationMin: service.durationMin,
        barberName: barberWithCap.displayName,
      });
    }

    // 7. Agenda reminder pra 24h antes (ADR-007 §3).
    //    Skip se appt for em menos de 24h (reminder não faz sentido).
    void this.scheduleReminder({
      apptId: created.id,
      startAt: startAtUtc,
    });

    return { status: 201, body: response };
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

  private async sendConfirmationEmail(args: {
    to: string;
    appointmentId: string;
    startAt: Date;
    endAt: Date;
    customerName: string;
    tenantName: string;
    tenantTimezone: string;
    serviceName: string;
    serviceDurationMin: number;
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
        tenantName: args.tenantName,
        customerName: args.customerName,
        dateLabel: formatDate(args.startAt, args.tenantTimezone),
        timeLabel: formatTime(args.startAt, args.tenantTimezone),
        durationLabel: formatDuration(args.serviceDurationMin),
        serviceName: args.serviceName,
        barberName: args.barberName,
        cancelUrl,
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
