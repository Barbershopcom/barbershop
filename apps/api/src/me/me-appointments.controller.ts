import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { fromZonedTime } from 'date-fns-tz';
import {
  type MyAppointmentItem,
  type MyAppointmentsQuery,
  myAppointmentsQuerySchema,
} from '@barbearia/schemas';

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
  private async resolveEmployee(
    ctx: TenantContextValue,
  ): Promise<{ id: string; tenantId: string; barbershopId: string; timezone: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, tenantId: true, barbershopId: true },
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
        status: { in: ['booked', 'completed'] },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        customerName: true,
        customerPhone: true,
        service: {
          select: { id: true, name: true, durationMin: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      status: r.status as MyAppointmentItem['status'],
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      service: r.service,
    }));
  }
}
