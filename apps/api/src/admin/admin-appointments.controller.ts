import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { fromZonedTime } from 'date-fns-tz';
import {
  type AdminAppointmentItem,
  type AdminAppointmentsQuery,
  adminAppointmentsQuerySchema,
  type AdminCreateAppointmentInput,
  adminCreateAppointmentSchema,
  type BookedAppointment,
  type RescheduleAppointmentInput,
  rescheduleAppointmentSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EmailService } from '../email/email.service';
import { BookingRescheduleError } from '../slots/booking.service';
import { BookingService } from '../slots/booking.service';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Endpoints administrativos sobre appointments — exigem role admin no
 * tenant. Sprint 4 abre só cancelamento; mais ações (reagendar,
 * mark no-show) entram quando forem pedidas.
 *
 * Cancelar liberar o slot: trigger EXCLUDE constraint só vale pra
 * status='booked', então cancelar permite outro booking no mesmo
 * horário (UX correto: cliente desistiu, vagas ficam disponíveis).
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(
    private readonly email: EmailService,
    private readonly booking: BookingService,
  ) {}

  /**
   * Confirma que o user logado é admin no tenant resolvido.
   * Resolve tenant via Employee linkado (não exige X-Tenant-Id).
   */
  private async requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string; timezone: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: user.id },
      select: { tenantId: true, role: true },
    });
    if (!employee) {
      throw new ForbiddenException(
        'Usuário não vinculado a nenhum funcionário.',
      );
    }
    if (employee.role !== 'admin' && employee.role !== 'admin_barber') {
      throw new ForbiddenException('Apenas admin pode acessar essa rota.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    const tenant = await ctx.tx.tenant.findUnique({
      where: { id: employee.tenantId },
      select: { timezone: true },
    });
    return {
      tenantId: employee.tenantId,
      timezone: tenant?.timezone ?? 'America/Sao_Paulo',
    };
  }

  @Get()
  @ApiQuery({ name: 'from', description: 'YYYY-MM-DD (tenant TZ).' })
  @ApiQuery({ name: 'to', description: 'YYYY-MM-DD (tenant TZ). Janela max 31 dias.' })
  @ApiQuery({ name: 'barberId', required: false })
  @ApiQuery({ name: 'includeAllStatuses', required: false, type: Boolean })
  @ApiOkResponse({
    description:
      'Lista de appointments do tenant na janela. Default só status=booked; passe includeAllStatuses=true pra ver cancelados/no_show/completed.',
  })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(adminAppointmentsQuerySchema)) query: AdminAppointmentsQuery,
  ): Promise<AdminAppointmentItem[]> {
    const admin = await this.requireAdmin(ctx, user);

    const fromUtc = fromZonedTime(`${query.from} 00:00:00`, admin.timezone);
    const [ty, tm, td] = [
      Number(query.to.slice(0, 4)),
      Number(query.to.slice(5, 7)),
      Number(query.to.slice(8, 10)),
    ];
    const nextDay = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
    const toUtcExclusive = fromZonedTime(`${nextDay} 00:00:00`, admin.timezone);

    const rows = await ctx.tx.appointment.findMany({
      where: {
        startAt: { gte: fromUtc, lt: toUtcExclusive },
        ...(query.barberId ? { barberId: query.barberId } : {}),
        ...(query.includeAllStatuses ? {} : { status: 'booked' }),
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        cancelledBy: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        service: { select: { id: true, name: true, durationMin: true } },
        barber: { select: { id: true, displayName: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      status: r.status as AdminAppointmentItem['status'],
      cancelledBy: r.cancelledBy as AdminAppointmentItem['cancelledBy'],
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail,
      service: r.service,
      barber: r.barber,
    }));
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Appointment cancelado.' })
  async cancel(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);

    // RLS já filtra por tenant; findUnique pode retornar null se id
    // for de outro tenant ou inexistente.
    const appointment = await ctx.tx.appointment.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!appointment) throw new NotFoundException('Appointment não encontrado.');

    // Já cancelado: idempotente, no-op.
    if (appointment.status === 'cancelled') return;

    if (appointment.status !== 'booked') {
      throw new ForbiddenException(
        `Não é possível cancelar appointment com status '${appointment.status}'.`,
      );
    }

    // Carrega dados pro email ANTES do update — depois RLS pode complicar.
    const full = await ctx.tx.appointment.findUnique({
      where: { id },
      select: {
        startAt: true,
        endAt: true,
        customerName: true,
        customerEmail: true,
        service: { select: { name: true, durationMin: true } },
        barber: { select: { displayName: true } },
        barbershop: { select: { tenantId: true } },
      },
    });

    await ctx.tx.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledBy: 'admin',
        cancelledAt: new Date(),
      },
    });

    // Email best-effort (não trava response).
    if (full?.customerEmail) {
      const tenant = await ctx.tx.tenant.findUnique({
        where: { id: full.barbershop.tenantId },
        select: { name: true, timezone: true },
      });
      if (tenant) {
        void this.email.sendBookingCancelled({
          to: full.customerEmail,
          vars: {
            tenantName: tenant.name,
            customerName: full.customerName,
            dateLabel: formatDate(full.startAt, tenant.timezone),
            timeLabel: formatTime(full.startAt, tenant.timezone),
            durationLabel: formatDuration(full.service.durationMin),
            serviceName: full.service.name,
            barberName: full.barber.displayName,
          },
        });
      }
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Cria appointment manualmente (cliente ligou).' })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(adminCreateAppointmentSchema)) body: AdminCreateAppointmentInput,
  ): Promise<BookedAppointment> {
    const admin = await this.requireAdmin(ctx, user);
    return this.booking.bookAsAdmin({ tenantId: admin.tenantId, body });
  }

  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Appointment remarcado (id preservado, startAt/endAt atualizados).' })
  async reschedule(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rescheduleAppointmentSchema)) body: RescheduleAppointmentInput,
  ): Promise<{ id: string; oldStartAt: string; newStartAt: string; newEndAt: string }> {
    await this.requireAdmin(ctx, user);

    const exists = await ctx.tx.appointment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Appointment não encontrado.');

    try {
      const result = await this.booking.reschedule({
        appointmentId: id,
        newStartAtIso: body.newStartAt,
      });
      return {
        id: result.id,
        oldStartAt: result.oldStartAt.toISOString(),
        newStartAt: result.newStartAt.toISOString(),
        newEndAt: result.newEndAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof BookingRescheduleError) {
        if (err.code === 'not_found') throw new NotFoundException(err.message);
        if (err.code === 'invalid_input') throw new BadRequestException(err.message);
        if (err.code === 'invalid_status' || err.code === 'slot_unavailable') {
          throw new UnprocessableEntityException({ message: err.message, code: err.code });
        }
        if (err.code === 'slot_taken') {
          throw new ConflictException({ message: err.message, code: err.code });
        }
      }
      throw err;
    }
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
