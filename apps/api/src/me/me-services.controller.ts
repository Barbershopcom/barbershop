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
  type MyServiceItem,
  type ReplaceMyCapabilitiesInput,
  replaceMyCapabilitiesSchema,
} from '@barbearia/schemas';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Endpoints "meus serviços" — capabilities do barbeiro logado.
 *
 * Padrão de namespace /me/* — não exige X-Tenant-Id; backend resolve tenant
 * via employee linkado (igual /me/employee). RLS protege contra acessar
 * dados de outros tenants.
 *
 * Replace-all em PUT (igual barbershop-hours): cliente envia lista completa
 * dos serviços que faz, backend faz deleteMany + createMany na mesma tx.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/services')
export class MeServicesController {
  /** Resolve employee+tenant do user logado. Lança 404 se não vinculado. */
  private async resolveEmployee(ctx: TenantContextValue) {
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, tenantId: true, barbershopId: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }
    // Habilita SELECTs em tabelas tenant-scoped (services, capabilities).
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;
    return employee;
  }

  @Get()
  @ApiOkResponse({
    description:
      'Lista todos os serviços ATIVOS do barbershop + flag mine pra cada (true se faço esse serviço).',
  })
  async list(@Tx() ctx: TenantContextValue): Promise<MyServiceItem[]> {
    const employee = await this.resolveEmployee(ctx);

    // ADR-003 §3: filtra service.isActive — capabilities em serviços desativados
    // ficam invisíveis até admin reativar.
    const [services, capabilities] = await Promise.all([
      ctx.tx.service.findMany({
        where: { barbershopId: employee.barbershopId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMin: true,
          basePriceCents: true,
        },
        orderBy: { name: 'asc' },
      }),
      ctx.tx.barberServiceCapability.findMany({
        where: { barberId: employee.id },
        select: { serviceId: true },
      }),
    ]);

    const mineSet = new Set(capabilities.map((c) => c.serviceId));
    return services.map((service) => ({
      service,
      mine: mineSet.has(service.id),
    }));
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Substitui (replace-all) as capabilities do barbeiro logado.',
  })
  async replace(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(replaceMyCapabilitiesSchema)) body: ReplaceMyCapabilitiesInput,
  ): Promise<MyServiceItem[]> {
    const employee = await this.resolveEmployee(ctx);

    // Valida que todos serviceIds pertencem a esse barbershop (defesa contra
    // cliente malicioso enviando IDs de outro tenant).
    const validServices = await ctx.tx.service.findMany({
      where: {
        id: { in: body.serviceIds },
        barbershopId: employee.barbershopId,
        isActive: true,
      },
      select: { id: true },
    });
    const validIds = new Set(validServices.map((s) => s.id));
    const filteredIds = body.serviceIds.filter((id) => validIds.has(id));

    // Replace-all atômico (tx do TenantInterceptor já cobre)
    await ctx.tx.barberServiceCapability.deleteMany({ where: { barberId: employee.id } });
    if (filteredIds.length > 0) {
      await ctx.tx.barberServiceCapability.createMany({
        data: filteredIds.map((serviceId) => ({
          tenantId: employee.tenantId,
          barberId: employee.id,
          serviceId,
        })),
      });
    }

    return this.list(ctx);
  }
}
