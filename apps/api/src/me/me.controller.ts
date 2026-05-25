import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

import { type AuthenticatedUser, CurrentUser } from '../auth/auth.decorators';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

// Derivação canônica employee.role → tenant_memberships.roles (ver ADR-003 §5).
function rolesFor(employeeRole: string): string[] {
  switch (employeeRole) {
    case 'admin':
      return ['admin'];
    case 'barber':
      return ['barber'];
    case 'admin_barber':
      return ['admin', 'barber'];
    default:
      return ['barber'];
  }
}

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({
    description: 'Usuário autenticado (claims do JWT do Supabase).',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      role: user.role ?? null,
    };
  }

  @Get('tenants')
  @ApiOkResponse({
    description: 'Lista os tenants em que o usuário tem membership (filtrado por RLS).',
  })
  async tenants(@Tx() ctx: TenantContextValue) {
    const memberships = await ctx.tx.tenantMembership.findMany({
      where: { userId: ctx.userId },
      include: {
        tenant: {
          select: { id: true, slug: true, name: true, timezone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      tenant: m.tenant,
      roles: m.roles,
      joinedAt: m.createdAt,
    }));
  }

  @Get('employee')
  @ApiOkResponse({
    description:
      'Employee do usuário logado (após auto-link) + barbershop + tenant. 404 se não vinculado.',
  })
  async employee(@Tx() ctx: TenantContextValue) {
    // RLS policy employees_self_select_linked filtra por app.user_id.
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      include: {
        barbershop: {
          select: { id: true, name: true, tenantId: true },
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }

    // Busca tenant via membership (ambos têm policies user-scoped, funciona sem tenantId)
    const membership = await ctx.tx.tenantMembership.findFirst({
      where: { userId: ctx.userId, tenantId: employee.barbershop.tenantId },
      include: { tenant: { select: { id: true, slug: true, name: true, timezone: true } } },
    });

    return {
      employee: {
        id: employee.id,
        displayName: employee.displayName,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
      },
      barbershop: {
        id: employee.barbershop.id,
        name: employee.barbershop.name,
      },
      tenant: membership?.tenant ?? null,
      roles: membership?.roles ?? rolesFor(employee.role),
    };
  }

  @Post('employee/link')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Vincula o usuário logado ao Employee com mesmo email.',
  })
  @ApiResponse({ status: 403, description: 'Nenhum employee disponível pra este email.' })
  @ApiResponse({ status: 409, description: 'Já existe vínculo, ou múltiplos employees candidatos.' })
  async link(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    if (!user.email) {
      throw new BadRequestException('JWT sem email — auto-link requer email.');
    }

    // 1) Se já vinculado, é idempotente — retorna o employee atual.
    const existing = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true, barbershopId: true },
    });
    if (existing) {
      return this.employee(ctx);
    }

    // 2) Busca candidatos: employees não-vinculados com email igual.
    //    Policy employees_self_link_select filtra por app.user_email (interceptor setou).
    const candidates = await ctx.tx.employee.findMany({
      where: { email: user.email, appUserId: null },
      include: { barbershop: { select: { id: true, tenantId: true } } },
    });

    if (candidates.length === 0) {
      throw new ForbiddenException(
        `Nenhum funcionário cadastrado com o email ${user.email}. Peça pro admin te cadastrar.`,
      );
    }
    if (candidates.length > 1) {
      throw new ConflictException(
        'Múltiplos funcionários cadastrados com este email. Contate o admin.',
      );
    }

    const employee = candidates[0]!;

    // 3) Linka: app_user_id ← user.id. RLS update policy permite.
    await ctx.tx.employee.update({
      where: { id: employee.id },
      data: { appUserId: ctx.userId },
    });

    // 4) Cria membership com roles derivados.
    //    Não usamos upsert porque tenant_memberships não tem UPDATE policy
    //    (auto-link só CRIA membership; mudanças de role vão pela web admin).
    //    P2002 (já existe) é tratado como sucesso silencioso.
    try {
      await ctx.tx.tenantMembership.create({
        data: {
          userId: ctx.userId,
          tenantId: employee.barbershop.tenantId,
          roles: rolesFor(employee.role),
        },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
        throw err;
      }
      // Membership já existe — caso raro de auto-link re-executado. Ignora.
    }

    // 5) Retorna o employee + tenant (re-uso de this.employee)
    return this.employee(ctx);
  }
}
