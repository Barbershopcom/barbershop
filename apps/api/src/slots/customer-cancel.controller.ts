import {
  BadRequestException,
  Controller,
  Get,
  GoneException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/auth.decorators';
import { EmailService } from '../email/email.service';
import { formatPriceBRL, tenantContactVars } from '../email/format';
import { PrismaService } from '../prisma/prisma.service';
import { decodeCancelToken } from './cancel-token';

/**
 * Cliente cancela appointment via magic link recebido por email.
 *
 * Two-step flow (ADR-006 §9) pra proteger contra preview-link bots
 * (Gmail/iMessage fazem GET em URLs no email):
 *   GET  /public/appointments/cancel/:token  → preview (dados pra confirm UI)
 *   POST /public/appointments/cancel/:token  → executa cancel
 *
 * Rate limit: 20/min/IP (ADR-006 §8).
 * Bypassa RLS (igual booking/slots — ADR-004 §5).
 */
@ApiTags('public-cancel')
@Public()
@Controller('public/appointments/cancel')
export class CustomerCancelController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  @Get(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiParam({ name: 'token', description: 'Token HMAC do email.' })
  @ApiOkResponse({
    description:
      'Dados do appointment pra UI de confirmação. 404 se token inválido/expirado, 410 se já cancelado.',
  })
  async preview(@Param('token') token: string): Promise<CancelPreview> {
    return this.resolveAppointment(token);
  }

  @Post(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiParam({ name: 'token', description: 'Token HMAC do email.' })
  @ApiOkResponse({ description: 'Appointment cancelado (200).' })
  async cancel(@Param('token') token: string): Promise<{ ok: true }> {
    const appt = await this.resolveAppointment(token);

    // Re-checa status (preview foi 200 mas pode ter sido cancelado entre preview e POST)
    if (appt.status === 'cancelled') {
      throw new GoneException('Esse agendamento já foi cancelado.');
    }

    await this.prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'cancelled',
        cancelledBy: 'customer',
        cancelledAt: new Date(),
      },
    });

    // Email de confirmação de cancelamento (best-effort, não trava response)
    if (appt.customerEmail) {
      void this.email.sendBookingCancelled({
        to: appt.customerEmail,
        vars: {
          tenantName: appt.tenantName,
          customerName: appt.customerName,
          dateLabel: appt.dateLabel,
          timeLabel: appt.timeLabel,
          durationLabel: appt.durationLabel,
          serviceName: appt.serviceName,
          barberName: appt.barberName,
          priceLabel: appt.priceLabel,
          ...tenantContactVars({
            name: appt.tenantName,
            phoneE164: appt.tenantPhoneE164,
            addressLine: appt.tenantAddressLine,
            instagramHandle: appt.tenantInstagramHandle,
          }),
        },
      });
    }

    return { ok: true };
  }

  /** Decodifica token + busca dados pra response. Lança HTTP errors apropriados. */
  private async resolveAppointment(token: string): Promise<CancelPreview> {
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET');
    if (!secret) {
      throw new Error('APPOINTMENT_CANCEL_SECRET não configurado.');
    }
    const decoded = decodeCancelToken(token, secret);
    if (!decoded.ok) {
      if (decoded.code === 'expired') {
        throw new GoneException('Esse link expirou.');
      }
      throw new BadRequestException('Token inválido.');
    }

    const appt = await this.prisma.appointment.findUnique({
      where: { id: decoded.payload.apptId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        customerName: true,
        customerEmail: true,
        service: { select: { name: true, durationMin: true, basePriceCents: true } },
        barber: { select: { displayName: true } },
        barbershop: { select: { name: true, tenantId: true } },
      },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.barbershop.tenantId },
      select: {
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    return {
      id: appt.id,
      status: appt.status as CancelPreview['status'],
      startAtIso: appt.startAt.toISOString(),
      endAtIso: appt.endAt.toISOString(),
      customerName: appt.customerName,
      customerEmail: appt.customerEmail,
      tenantName: tenant.name,
      tenantPhoneE164: tenant.phoneE164,
      tenantAddressLine: tenant.addressLine,
      tenantInstagramHandle: tenant.instagramHandle,
      serviceName: appt.service.name,
      barberName: appt.barber.displayName,
      dateLabel: formatDate(appt.startAt, tenant.timezone),
      timeLabel: formatTime(appt.startAt, tenant.timezone),
      durationLabel: formatDuration(appt.service.durationMin),
      priceLabel: formatPriceBRL(appt.service.basePriceCents),
    };
  }
}

interface CancelPreview {
  id: string;
  status:
    | 'awaiting_payment'
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'expired'
    | 'no_show';
  startAtIso: string;
  endAtIso: string;
  customerName: string;
  customerEmail: string | null;
  tenantName: string;
  tenantPhoneE164: string | null;
  tenantAddressLine: string | null;
  tenantInstagramHandle: string | null;
  serviceName: string;
  barberName: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  priceLabel: string;
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
