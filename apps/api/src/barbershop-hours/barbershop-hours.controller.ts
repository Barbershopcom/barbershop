import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type ReplaceHoursInput, replaceHoursSchema } from '@barbearia/schemas';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { resolveBarbershopId } from '../tenancy/resolve-barbershop';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Horários da barbearia. Modelagem replace-all: PUT envia a semana completa,
 * API substitui as linhas existentes da barbershop. Mantém código simples
 * (sem CRUD por linha) e dá UX natural ("editar horários da semana").
 */
@ApiTags('barbershop-hours')
@ApiBearerAuth()
@Controller('barbershop-hours')
export class BarbershopHoursController {
  private async requireTenant(ctx: TenantContextValue): Promise<string> {
    if (!ctx.tenantId) {
      throw new BadRequestException('Header X-Tenant-Id obrigatório.');
    }
    return ctx.tenantId;
  }

  @Get()
  @ApiQuery({ name: 'barbershopId', required: false })
  async list(
    @Tx() ctx: TenantContextValue,
    @Query('barbershopId') barbershopId?: string,
  ) {
    await this.requireTenant(ctx);
    const shopId = await resolveBarbershopId(ctx, barbershopId);
    return ctx.tx.barbershopHours.findMany({
      where: { barbershopId: shopId },
      orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }],
    });
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'barbershopId', required: false })
  async replace(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(replaceHoursSchema)) body: ReplaceHoursInput,
    @Query('barbershopId') barbershopId?: string,
  ) {
    const tenantId = await this.requireTenant(ctx);
    const shopId = await resolveBarbershopId(ctx, barbershopId);

    // Atomicidade já está no $transaction do TenantInterceptor.
    await ctx.tx.barbershopHours.deleteMany({ where: { barbershopId: shopId } });
    if (body.ranges.length > 0) {
      await ctx.tx.barbershopHours.createMany({
        data: body.ranges.map((r) => ({
          tenantId,
          barbershopId: shopId,
          weekday: r.weekday,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
        })),
      });
    }

    return ctx.tx.barbershopHours.findMany({
      where: { barbershopId: shopId },
      orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }],
    });
  }
}
