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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  type BarberTimeOffDto,
  type CreateBarberTimeOffInput,
  type CreateBarberTimeOffResponse,
  createBarberTimeOffSchema,
  type PreviewTimeOffQuery,
  type PreviewTimeOffResponse,
  previewTimeOffQuerySchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EmailService } from '../email/email.service';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * CRUD de BarberTimeOff. Exige role admin/admin_barber.
 *
 * Fluxo recomendado pelo frontend:
 *   1. GET /admin/time-off/preview?... → conta appointments overlapping
 *   2. UI mostra modal "X agendamentos serão cancelados, confirma?"
 *   3. POST /admin/time-off com cancelOverlapping=true → cria + cancela em batch
 *
 * Auto-cancel dispara email de cancelamento pra cada cliente (best-effort).
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/time-off')
export class AdminTimeOffController {
  constructor(private readonly email: EmailService) {}

  private async requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: user.id },
      select: { tenantId: true, role: true },
    });
    if (!employee) throw new ForbiddenException('Usuário não vinculado.');
    if (employee.role !== 'admin' && employee.role !== 'admin_barber') {
      throw new ForbiddenException('Apenas admin pode gerenciar time-off.');
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return { tenantId: employee.tenantId };
  }

  @Get()
  @ApiQuery({ name: 'barberId', required: false })
  @ApiOkResponse({ description: 'Lista de TimeOff do tenant, opcionalmente filtrado por barbeiro.' })
  async list(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Query('barberId') barberId?: string,
  ): Promise<BarberTimeOffDto[]> {
    await this.requireAdmin(ctx, user);
    const rows = await ctx.tx.barberTimeOff.findMany({
      where: { ...(barberId ? { barberId } : {}) },
      orderBy: { startAt: 'desc' },
    });
    return rows.map(toDto);
  }

  @Get('preview')
  @ApiOkResponse({
    description: 'Conta appointments overlapping com o range — UI usa pra modal de confirmação.',
  })
  async preview(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(previewTimeOffQuerySchema)) query: PreviewTimeOffQuery,
  ): Promise<PreviewTimeOffResponse> {
    await this.requireAdmin(ctx, user);
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);

    const overlapping = await ctx.tx.appointment.findMany({
      where: {
        barberId: query.barberId,
        status: 'booked',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        id: true,
        startAt: true,
        customerName: true,
        service: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return {
      overlappingCount: overlapping.length,
      appointments: overlapping.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        customerName: a.customerName,
        serviceName: a.service.name,
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description:
      'Cria TimeOff + opcionalmente cancela appointments overlapping. Retorna contagem.',
  })
  async create(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBarberTimeOffSchema)) body: CreateBarberTimeOffInput,
  ): Promise<CreateBarberTimeOffResponse> {
    const admin = await this.requireAdmin(ctx, user);

    // Confirma que o barbeiro existe no tenant
    const barber = await ctx.tx.employee.findFirst({
      where: { id: body.barberId, tenantId: admin.tenantId },
      select: { id: true },
    });
    if (!barber) throw new NotFoundException('Barbeiro não encontrado.');

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);

    // Cria TimeOff
    const created = await ctx.tx.barberTimeOff.create({
      data: {
        tenantId: admin.tenantId,
        barberId: body.barberId,
        startAt,
        endAt,
        reason: body.reason ?? null,
      },
    });

    let cancelledCount = 0;
    if (body.cancelOverlapping) {
      // Carrega dados pros emails ANTES do update batch
      const toCancel = await ctx.tx.appointment.findMany({
        where: {
          barberId: body.barberId,
          status: 'booked',
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: {
          id: true,
          startAt: true,
          customerName: true,
          customerEmail: true,
          service: { select: { name: true, durationMin: true } },
          barber: { select: { displayName: true } },
        },
      });

      if (toCancel.length > 0) {
        const reasonText = `Funcionário indisponível${body.reason ? `: ${body.reason}` : ''}`;
        await ctx.tx.appointment.updateMany({
          where: { id: { in: toCancel.map((a) => a.id) } },
          data: {
            status: 'cancelled',
            cancelledBy: 'system',
            cancelledAt: new Date(),
            cancelReason: reasonText,
          },
        });
        cancelledCount = toCancel.length;

        // Dispara emails best-effort. Busca tenant uma vez.
        const tenant = await ctx.tx.tenant.findUnique({
          where: { id: admin.tenantId },
          select: { name: true, timezone: true },
        });
        if (tenant) {
          for (const a of toCancel) {
            if (!a.customerEmail) continue;
            void this.email.sendBookingCancelled({
              to: a.customerEmail,
              vars: {
                tenantName: tenant.name,
                customerName: a.customerName,
                dateLabel: formatDate(a.startAt, tenant.timezone),
                timeLabel: formatTime(a.startAt, tenant.timezone),
                durationLabel: formatDuration(a.service.durationMin),
                serviceName: a.service.name,
                barberName: a.barber.displayName,
              },
            });
          }
        }
      }
    }

    return {
      timeOff: toDto(created),
      cancelledAppointmentsCount: cancelledCount,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Remove TimeOff (não desfaz cancelamentos passados).' })
  async remove(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requireAdmin(ctx, user);
    try {
      await ctx.tx.barberTimeOff.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Record to delete does not exist')) {
        throw new NotFoundException('TimeOff não encontrado.');
      }
      throw err;
    }
  }
}

function toDto(row: {
  id: string;
  barberId: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  createdAt: Date;
}): BarberTimeOffDto {
  return {
    id: row.id,
    barberId: row.barberId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
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

