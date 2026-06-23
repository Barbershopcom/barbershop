import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  type UpdateTenantProfileInput,
  updateTenantProfileSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

/**
 * Endpoints de perfil do tenant administrado pelo admin logado (ADR-012).
 *
 * Tenant resolvido via Employee linkado ao user (mesmo padrão do
 * AdminAppointmentsController). Só admin/admin_barber pode editar.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/tenant/me')
export class AdminTenantProfileController {
  private requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    return assertTenantAdmin(ctx, user, 'acessar essa rota');
  }

  @Get()
  @ApiOkResponse({ description: 'Perfil do tenant do admin logado.' })
  async get(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const admin = await this.requireAdmin(ctx, user);
    const tenant = await ctx.tx.tenant.findUnique({
      where: { id: admin.tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        timezone: true,
        phoneE164: true,
        addressLine: true,
        instagramHandle: true,
        listedPublicly: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    const barbershop = await ctx.tx.barbershop.findFirst({
      where: { tenantId: admin.tenantId },
      select: { lateCancelFeePct: true },
    });
    return { ...tenant, lateCancelFeePct: barbershop?.lateCancelFeePct ?? 50 };
  }

  @Patch()
  @ApiOkResponse({ description: 'Perfil atualizado.' })
  async update(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateTenantProfileSchema)) body: UpdateTenantProfileInput,
  ) {
    const admin = await this.requireAdmin(ctx, user);
    try {
      const updated = await ctx.tx.tenant.update({
        where: { id: admin.tenantId },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.listedPublicly !== undefined && {
            listedPublicly: body.listedPublicly,
          }),
          ...(body.phoneE164 !== undefined && { phoneE164: body.phoneE164 }),
          ...(body.addressLine !== undefined && { addressLine: body.addressLine }),
          ...(body.instagramHandle !== undefined && {
            instagramHandle: body.instagramHandle,
          }),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          timezone: true,
          phoneE164: true,
          addressLine: true,
          instagramHandle: true,
        },
      });

      if (body.lateCancelFeePct !== undefined) {
        await ctx.tx.barbershop.updateMany({
          where: { tenantId: admin.tenantId },
          data: { lateCancelFeePct: body.lateCancelFeePct },
        });
      }

      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Tenant não encontrado.');
      }
      throw err;
    }
  }
}
