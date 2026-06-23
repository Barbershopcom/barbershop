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
import { randomUUID } from 'node:crypto';

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
  @ApiResponse({ status: 409, description: 'Slug já em uso, ou CPF já vinculado a outra conta.' })
  async createTenant(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(createTenantOnboardingSchema))
    body: CreateTenantOnboardingInput,
  ) {
    // Um usuário pode criar/gerenciar N barbearias (cada uma vira um tenant
    // próprio com membership admin). O anti-abuso de teste grátis fica no
    // UNIQUE de app_users.cpf: a MESMA conta pode ter N barbearias, mas uma
    // pessoa (CPF) não consegue abrir outra conta pra ganhar trial de novo.

    // Gera UUID no app para evitar RETURNING no tenant INSERT.
    // RETURNING aplica a SELECT policy na linha recém-criada, e
    // tenants_member_select exige membership — que ainda não existe.
    // ID pré-gerado + raw INSERT sem RETURNING evita esse galho.
    const tenantId = randomUUID();
    const timezone = body.tenant.timezone;

    try {
      // 0) vincula o CPF ao usuário. O UNIQUE em app_users.cpf bloqueia que
      //    a mesma pessoa reabra outra conta só pra ganhar novo teste grátis.
      //    Se o CPF já pertence a outra conta -> P2002 (tratado no catch).
      await ctx.tx.appUser.update({
        where: { id: ctx.userId },
        data: { cpf: body.ownerCpf },
      });

      // 1) tenant — INSERT raw, sem RETURNING (inclui owner_cpf + trial 14d)
      await ctx.tx.$executeRaw`
        INSERT INTO tenants (id, slug, name, timezone, owner_cpf, trial_ends_at, updated_at)
        VALUES (${tenantId}::uuid, ${body.tenant.slug}, ${body.tenant.name}, ${timezone}, ${body.ownerCpf}, now() + interval '14 days', now())
      `;

      // 2) membership pro criador como admin
      //    SELECT policy de tenant_memberships (FOR SELECT) usa user_id = app.user_id,
      //    que bate com o INSERT — RETURNING funciona via Prisma normal.
      await ctx.tx.tenantMembership.create({
        data: { userId: ctx.userId, tenantId, roles: ['admin'] },
      });

      // 3) tenant context setado — daqui pra frente, RLS tenant-scoped libera tudo
      await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      // 4) organization (tenant-scoped SELECT policy: tenant_id = app.tenant_id ✓)
      const organization = await ctx.tx.organization.create({
        data: {
          tenantId,
          name: body.organization.name,
          description: body.organization.description ?? null,
          logoUrl: body.organization.logoUrl ?? null,
        },
      });

      // 5) location
      const location = await ctx.tx.location.create({
        data: {
          tenantId,
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
          tenantId,
          locationId: location.id,
          name: body.barbershop.name,
          description: body.barbershop.description ?? null,
          lateCancelFeePct: body.barbershop.lateCancelFeePct,
        },
      });

      return {
        tenant: {
          id: tenantId,
          slug: body.tenant.slug,
          name: body.tenant.name,
          timezone,
        },
        organizationId: organization.id,
        locationId: location.id,
        barbershopId: barbershop.id,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[]).join(',')
          : String(err.meta?.target ?? '');
        if (target.includes('cpf')) {
          throw new ConflictException(
            'Esse CPF já está vinculado a uma conta. Faça login na conta existente para gerenciar suas barbearias.',
          );
        }
        if (target.includes('slug')) {
          throw new ConflictException('Esse slug já está em uso. Escolha outro.');
        }
        throw new ConflictException('Registro duplicado.');
      }
      throw err;
    }
  }
}
