import {
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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { fromZonedTime } from 'date-fns-tz';
import {
  type BarberActionResult,
  type MyAppointmentItem,
  type MyAppointmentsQuery,
  myAppointmentsQuerySchema,
  type RejectAppointmentInput,
  rejectAppointmentSchema,
} from '@barbearia/schemas';

import { AppointmentStatusService } from '../appointments/appointment-status.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Listing dos próprios appointments — visão do barbeiro logado.
 *
 * Filtra por barberId = meu employee.id automaticamente. Janela [from..to]
 * interpretada no timezone do tenant (backend converte pra UTC pra query).
 *
 * Status filtrado: retorna 'booked' e 'completed' (no_show e cancelled
 * não interessam pra visão "minha agenda"). UI pode mostrar histórico se
 * pedir explicitamente — adicionar query `?includeCancelled=true` no futuro.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/appointments')
export class MeAppointmentsController {
  constructor(private readonly apptStatus: AppointmentStatusService) {}

  /**
   * Confirma que o appointment pertence ao barbeiro logado (ou que ele é
   * admin do tenant). RLS via ctx.tx já restringe ao tenant; aqui checamos
   * que o barberId bate. Retorna o status atual.
   */
  private async assertOwnership(
    ctx: TenantContextValue,
    appointmentId: string,
  ): Promise<{ status: string }> {
    const employee = await this.resolveEmployee(ctx);
    const appt = await ctx.tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { barberId: true, status: true },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');
    if (appt.barberId !== employee.id && employee.role !== 'admin') {
      throw new ForbiddenException('Esse agendamento não é seu.');
    }
    return { status: appt.status };
  }

  private async resolveEmployee(ctx: TenantContextValue): Promise<{
    id: string;
    tenantId: string;
    barbershopId: string;
    timezone: string;
    role: string;
  }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, tenantId: true, barbershopId: true, role: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;

    // tenant.timezone precisa ser lido após o SET LOCAL acima (RLS-protected).
    const tenant = await ctx.tx.tenant.findUnique({
      where: { id: employee.tenantId },
      select: { timezone: true },
    });
    return {
      id: employee.id,
      tenantId: employee.tenantId,
      barbershopId: employee.barbershopId,
      timezone: tenant?.timezone ?? 'America/Sao_Paulo',
      role: employee.role,
    };
  }

  @Get()
  @ApiQuery({
    name: 'from',
    description: 'Data inicial YYYY-MM-DD no timezone do tenant.',
  })
  @ApiQuery({
    name: 'to',
    description: 'Data final YYYY-MM-DD (inclusiva). Janela máxima 31 dias.',
  })
  @ApiOkResponse({
    description: 'Appointments do barbeiro logado na janela, ordenados por startAt.',
  })
  async list(
    @Tx() ctx: TenantContextValue,
    @Query(new ZodValidationPipe(myAppointmentsQuerySchema)) query: MyAppointmentsQuery,
  ): Promise<MyAppointmentItem[]> {
    const employee = await this.resolveEmployee(ctx);

    // Janela em UTC: do início do dia `from` até início do dia after `to`
    const fromUtc = fromZonedTime(`${query.from} 00:00:00`, employee.timezone);
    const [ty, tm, td] = [
      Number(query.to.slice(0, 4)),
      Number(query.to.slice(5, 7)),
      Number(query.to.slice(8, 10)),
    ];
    const nextDayStr = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
    const toUtcExclusive = fromZonedTime(`${nextDayStr} 00:00:00`, employee.timezone);

    const rows = await ctx.tx.appointment.findMany({
      where: {
        barberId: employee.id,
        startAt: { gte: fromUtc, lt: toUtcExclusive },
        // Agenda do barbeiro: ativos (aguardando/pending/confirmado) + concluídos.
        status: { in: ['awaiting_payment', 'pending', 'confirmed', 'completed'] },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        confirmDeadline: true,
        customerName: true,
        customerPhone: true,
        service: {
          select: { id: true, name: true, durationMin: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    return rows.map(toItem);
  }

  @Get('pending')
  @ApiOkResponse({
    description: 'Agendamentos pending do barbeiro (aguardando confirmação), sem janela.',
  })
  async pending(@Tx() ctx: TenantContextValue): Promise<MyAppointmentItem[]> {
    const employee = await this.resolveEmployee(ctx);
    const rows = await ctx.tx.appointment.findMany({
      where: { barberId: employee.id, status: 'pending' },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        confirmDeadline: true,
        customerName: true,
        customerPhone: true,
        service: { select: { id: true, name: true, durationMin: true } },
      },
      // Mais urgente primeiro (deadline mais próximo).
      orderBy: { confirmDeadline: 'asc' },
    });
    return rows.map(toItem);
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Barbeiro confirma um agendamento pending.' })
  async confirm(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BarberActionResult> {
    await this.assertOwnership(ctx, id);
    const r = await this.apptStatus.confirm(id);
    if (!r.ok) {
      throw new ConflictException({
        message: `Não foi possível confirmar (status atual: '${r.currentStatus}').`,
        code: 'invalid_transition',
        currentStatus: r.currentStatus,
      });
    }
    return { id, status: 'confirmed' };
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Barbeiro recusa um agendamento pending (estorna).' })
  async reject(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rejectAppointmentSchema)) body: RejectAppointmentInput,
  ): Promise<BarberActionResult> {
    await this.assertOwnership(ctx, id);
    const r = await this.apptStatus.reject(id, body.reason);
    if (!r.ok) {
      throw new ConflictException({
        message: `Não foi possível recusar (status atual: '${r.currentStatus}').`,
        code: 'invalid_transition',
        currentStatus: r.currentStatus,
      });
    }
    return { id, status: 'cancelled' };
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Barbeiro marca um confirmed como concluído.' })
  async complete(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BarberActionResult> {
    await this.assertOwnership(ctx, id);
    const r = await this.apptStatus.complete(id);
    if (!r.ok) {
      throw new ConflictException({
        message: `Não foi possível concluir (status atual: '${r.currentStatus}').`,
        code: 'invalid_transition',
        currentStatus: r.currentStatus,
      });
    }
    return { id, status: 'completed' };
  }

  @Patch(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Barbeiro marca falta do cliente num confirmed.' })
  async noShow(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BarberActionResult> {
    await this.assertOwnership(ctx, id);
    const r = await this.apptStatus.noShow(id);
    if (!r.ok) {
      throw new ConflictException({
        message: `Não foi possível marcar falta (status atual: '${r.currentStatus}').`,
        code: 'invalid_transition',
        currentStatus: r.currentStatus,
      });
    }
    return { id, status: 'no_show' };
  }
}

interface ApptRow {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  confirmDeadline: Date | null;
  customerName: string;
  customerPhone: string | null;
  service: { id: string; name: string; durationMin: number };
}

function toItem(r: ApptRow): MyAppointmentItem {
  return {
    id: r.id,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    status: r.status as MyAppointmentItem['status'],
    confirmDeadline: r.confirmDeadline ? r.confirmDeadline.toISOString() : null,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    service: r.service,
  };
}
