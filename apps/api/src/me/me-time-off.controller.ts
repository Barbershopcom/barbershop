import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type CreateMyTimeOffInput,
  type CreateMyTimeOffResponse,
  createMyTimeOffSchema,
  type MyTimeOffDto,
  slotOccupyingStatuses,
} from '@barbearia/schemas';

import { AppointmentStatusService } from '../appointments/appointment-status.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Folgas self-service do barbeiro (ADR-018 §6/§7).
 *
 * Diferente do admin (`/admin/time-off`), aqui o barberId é sempre o próprio
 * funcionário logado — ele não precisa (nem pode) marcar folga de outro.
 *
 * POST cancela os appointments ativos no range via state machine
 * (cancelForTimeOff → refund + notifica cliente), mantendo coerência com a
 * arquitetura payment-ready. GET lista só as folgas futuras; DELETE remove
 * uma folga própria (não desfaz cancelamentos já efetuados).
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/time-off')
export class MeTimeOffController {
  constructor(private readonly apptStatus: AppointmentStatusService) {}

  private async resolveEmployee(
    ctx: TenantContextValue,
  ): Promise<{ id: string; tenantId: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, tenantId: true, role: true },
    });
    if (!employee) {
      throw new ForbiddenException('Usuário não vinculado a nenhum funcionário.');
    }
    if (employee.role === 'admin') {
      // admin puro não atende — não tem agenda própria pra folga.
      throw new ForbiddenException('Admin sem perfil de barbeiro não marca folga.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return { id: employee.id, tenantId: employee.tenantId };
  }

  @Get()
  @ApiOkResponse({ description: 'Folgas futuras do barbeiro logado.' })
  async list(@Tx() ctx: TenantContextValue): Promise<MyTimeOffDto[]> {
    const employee = await this.resolveEmployee(ctx);
    const rows = await ctx.tx.barberTimeOff.findMany({
      where: { barberId: employee.id, endAt: { gte: new Date() } },
      orderBy: { startAt: 'asc' },
    });
    return rows.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description: 'Cria folga própria + cancela appointments ativos no range (refund + aviso).',
  })
  async create(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(createMyTimeOffSchema)) body: CreateMyTimeOffInput,
  ): Promise<CreateMyTimeOffResponse> {
    const employee = await this.resolveEmployee(ctx);
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);

    const created = await ctx.tx.barberTimeOff.create({
      data: {
        tenantId: employee.tenantId,
        barberId: employee.id,
        startAt,
        endAt,
        reason: body.reason ?? null,
      },
    });

    // Cancela os ativos no overlap, um a um, pela state machine (refund + notify).
    const overlapping = await ctx.tx.appointment.findMany({
      where: {
        barberId: employee.id,
        status: { in: [...slotOccupyingStatuses] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });

    const reasonText = `Barbeiro indisponível${body.reason ? `: ${body.reason}` : ''}`;
    let cancelledCount = 0;
    for (const a of overlapping) {
      const r = await this.apptStatus.cancelForTimeOff(a.id, reasonText);
      if (r.ok) cancelledCount += 1;
    }

    return { timeOff: toDto(created), cancelledAppointmentsCount: cancelledCount };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Remove folga própria (não desfaz cancelamentos).' })
  async remove(
    @Tx() ctx: TenantContextValue,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const employee = await this.resolveEmployee(ctx);
    const existing = await ctx.tx.barberTimeOff.findUnique({
      where: { id },
      select: { barberId: true },
    });
    if (!existing) throw new NotFoundException('Folga não encontrada.');
    if (existing.barberId !== employee.id) {
      throw new ForbiddenException('Essa folga não é sua.');
    }
    await ctx.tx.barberTimeOff.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
}): MyTimeOffDto {
  return {
    id: row.id,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    reason: row.reason,
  };
}
