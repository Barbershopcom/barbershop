import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type CreateTenantOnboardingInput, createTenantOnboardingSchema } from '@barbearia/schemas';
import { Prisma } from '@prisma/client';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  @Post('tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, description: 'Tenant criado com cadeia Org→Location→Barbershop.' })
  @ApiResponse({ status: 409, description: 'Slug já em uso, ou user já tem tenant.' })
  async createTenant(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(createTenantOnboardingSchema))
    body: CreateTenantOnboardingInput,
  ) {
    // Regra MVP: 1 user = 1 tenant. Quando precisar de "barbeiro em 2 barbearias"
    // (ADR-001), abrir endpoint separado pra criar membership extra.
    const existing = await ctx.tx.tenantMembership.findFirst({
      where: { userId: ctx.userId },
      select: { tenantId: true },
    });
    if (existing) {
      throw new ConflictException('Usuário já está vinculado a um tenant.');
    }

    try {
      // 1) tenant — RLS exige só app.user_id setado (interceptor já fez)
      const tenant = await ctx.tx.tenant.create({
        data: {
          slug: body.tenant.slug,
          name: body.tenant.name,
          timezone: body.tenant.timezone,
        },
      });

      // 2) membership pro criador como admin — WITH CHECK passa porque user_id = app.user_id
      await ctx.tx.tenantMembership.create({
        data: { userId: ctx.userId, tenantId: tenant.id, roles: ['admin'] },
      });

      // 3) seta tenant context — daqui pra frente, RLS tenant-scoped libera inserts
      await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

      // 4) organization
      const organization = await ctx.tx.organization.create({
        data: {
          tenantId: tenant.id,
          name: body.organization.name,
          description: body.organization.description ?? null,
          logoUrl: body.organization.logoUrl ?? null,
        },
      });

      // 5) location
      const location = await ctx.tx.location.create({
        data: {
          tenantId: tenant.id,
          organizationId: organization.id,
          name: body.location.name,
          addressLine1: body.location.addressLine1,
          addressLine2: body.location.addressLine2 ?? null,
          city: body.location.city,
          state: body.location.state,
          postalCode: body.location.postalCode,
          country: body.location.country,
        },
      });

      // 6) barbershop
      const barbershop = await ctx.tx.barbershop.create({
        data: {
          tenantId: tenant.id,
          locationId: location.id,
          name: body.barbershop.name,
          description: body.barbershop.description ?? null,
        },
      });

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          timezone: tenant.timezone,
        },
        organizationId: organization.id,
        locationId: location.id,
        barbershopId: barbershop.id,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // unique violation no slug
        throw new ConflictException('Esse slug já está em uso. Escolha outro.');
      }
      throw err;
    }
  }
}
