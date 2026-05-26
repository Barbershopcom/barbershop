import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type MyScheduleItem,
  type ReplaceMyScheduleInput,
  replaceMyScheduleSchema,
  type Weekday,
} from '@barbearia/schemas';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Agenda semanal do barbeiro logado (BarberSchedule).
 *
 * Padrão idêntico ao /me/services (namespace /me, sem X-Tenant-Id;
 * backend resolve via employee linkado). Replace-all em PUT.
 *
 * Algoritmo de slots (Sprint 3): intercepta com BarbershopHours
 * (loja aberta) e subtrai appointments existentes.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/schedule')
export class MeScheduleController {
  private async resolveEmployee(ctx: TenantContextValue) {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, tenantId: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return employee;
  }

  @Get()
  @ApiOkResponse({
    description: 'Agenda semanal do barbeiro (todas as faixas, ordenadas por weekday + opensAt).',
  })
  async list(@Tx() ctx: TenantContextValue): Promise<MyScheduleItem[]> {
    const employee = await this.resolveEmployee(ctx);
    const rows = await ctx.tx.barberSchedule.findMany({
      where: { barberId: employee.id },
      select: { id: true, weekday: true, opensAt: true, closesAt: true },
      orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday as Weekday,
      opensAt: r.opensAt,
      closesAt: r.closesAt,
    }));
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Substitui (replace-all) a agenda semanal do barbeiro.' })
  async replace(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(replaceMyScheduleSchema)) body: ReplaceMyScheduleInput,
  ): Promise<MyScheduleItem[]> {
    const employee = await this.resolveEmployee(ctx);

    // Replace-all atômico (tx do TenantInterceptor já cobre)
    await ctx.tx.barberSchedule.deleteMany({ where: { barberId: employee.id } });
    if (body.ranges.length > 0) {
      await ctx.tx.barberSchedule.createMany({
        data: body.ranges.map((r) => ({
          tenantId: employee.tenantId,
          barberId: employee.id,
          weekday: r.weekday,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
        })),
      });
    }

    return this.list(ctx);
  }
}
