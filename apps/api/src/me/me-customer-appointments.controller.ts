import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type MyCustomerAppointmentItem,
  slotOccupyingStatuses,
} from '@barbearia/schemas';
import { canCancelAppointment } from '@barbearia/domain';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { EmailService } from '../email/email.service';
import { formatPriceBRL, tenantContactVars } from '../email/format';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from './customer.service';

/**
 * Endpoints "minhas reservas" pro CLIENTE FINAL (mobile-customer).
 *
 * Diferente de `/me/appointments` (que é pro barbeiro logado e filtra
 * por `barberId = employee.id`), este filtra por
 * `customerEmail = appUser.email`. Bookings são guest (sem userId no
 * Appointment) — vincular por email é o melhor proxy disponível até
 * cliente ter conta de verdade.
 *
 * Bypassa RLS (igual aos endpoints públicos /slots) porque cliente
 * reserva em N barbearias e não está vinculado a nenhum tenant
 * específico. Filtros por email são feitos explicitamente no Prisma.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/customer-appointments')
export class MeCustomerAppointmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly customers: CustomerService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      'Appointments do cliente logado (por customerId vinculado ou email). Ordenados por startAt desc.',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyCustomerAppointmentItem[]> {
    if (!user.email) {
      throw new BadRequestException(
        'Usuário sem email cadastrado — nada pra vincular.',
      );
    }

    // Garante Customer + faz account-linking retroativo (guest → conta).
    const { customerId } = await this.customers.ensureForUser(user);

    const rows = await this.prisma.appointment.findMany({
      // Filtra por customerId (após account-linking retroativo via ensureForUser).
      // Fallback: customerEmail p/ race condition (appointment novo após link).
      // SECURITY: garantir que appointment pertence ao user autenticado.
      where: {
        AND: [
          { OR: [{ customerId }, { customerEmail: user.email }] },
          { tenantId: { not: undefined } }, // válido
        ],
      },
      select: {
        id: true,
        tenantId: true,
        startAt: true,
        endAt: true,
        status: true,
        cancelledBy: true,
        cancelReason: true,
        customerId: true, // validação pós-query
        customerEmail: true,
        service: { select: { id: true, name: true, durationMin: true } },
        barber: { select: { id: true, displayName: true } },
        review: { select: { id: true } },
      },
      orderBy: { startAt: 'desc' },
      take: 100,
    });

    // Validação pós-query: garantir que TODOS os appointments pertencem ao user.
    // Previne vazamento se email é reutilizado ou DB fica inconsistente.
    const validated = rows.filter(
      (r) => r.customerId === customerId || r.customerEmail === user.email,
    );

    // Carrega tenants em batch (Barbershop não tem relation tenant direta).
    const tenantIds = Array.from(new Set(validated.map((r) => r.tenantId)));
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, slug: true, name: true, timezone: true },
    });
    const tenantById = new Map(tenants.map((t) => [t.id, t]));

    return validated.map((r) => {
      const t = tenantById.get(r.tenantId);
      return {
        id: r.id,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
        status: r.status as MyCustomerAppointmentItem['status'],
        cancelledBy: r.cancelledBy as MyCustomerAppointmentItem['cancelledBy'],
        cancelReason: r.cancelReason,
        service: r.service,
        barber: r.barber,
        tenant: t ?? { id: r.tenantId, slug: '', name: '', timezone: 'America/Sao_Paulo' },
        hasReview: r.review !== null,
      };
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Appointment cancelado.' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    if (!user.email) {
      throw new BadRequestException('Usuário sem email cadastrado.');
    }
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        status: true,
        startAt: true,
        customerName: true,
        customerEmail: true,
        service: { select: { name: true, durationMin: true, basePriceCents: true } },
        barber: { select: { displayName: true } },
      },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');
    if (appt.customerEmail !== user.email) {
      throw new ForbiddenException('Esse agendamento não é seu.');
    }
    if (appt.status === 'cancelled') return; // idempotente
    if (!slotOccupyingStatuses.includes(appt.status as never)) {
      throw new ForbiddenException(
        `Não é possível cancelar appointment com status '${appt.status}'.`,
      );
    }

    // Validar janela de cancelamento: 24h antes do appointment
    const canCancel = canCancelAppointment({
      appointmentStartMs: appt.startAt.getTime(),
      nowMs: Date.now(),
      cancelWindowHours: 24,
    });
    if (!canCancel) {
      throw new ForbiddenException(
        'Só é possível cancelar com 24h de antecedência.',
      );
    }

    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledBy: 'customer',
        cancelledAt: new Date(),
      },
    });

    // Email best-effort de confirmação de cancelamento.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: appt.tenantId },
      select: {
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
      },
    });
    if (!tenant) return;

    void this.email.sendBookingCancelled({
      to: appt.customerEmail,
      vars: {
        tenantName: tenant.name,
        customerName: appt.customerName,
        dateLabel: formatDate(appt.startAt, tenant.timezone),
        timeLabel: formatTime(appt.startAt, tenant.timezone),
        durationLabel: formatDuration(appt.service.durationMin),
        serviceName: appt.service.name,
        barberName: appt.barber.displayName,
        priceLabel: formatPriceBRL(appt.service.basePriceCents),
        ...tenantContactVars(tenant),
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
