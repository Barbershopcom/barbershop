import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type UpdateMyEmployeeInput, updateMyEmployeeSchema } from '@barbearia/schemas';

import { type AuthenticatedUser, CurrentUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
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
  private readonly logger = new Logger(MeController.name);

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

  @Patch('employee')
  @ApiOkResponse({
    description:
      'Edita campos do próprio perfil (displayName). Não muda role/isActive — admin via web.',
  })
  async updateEmployee(
    @Tx() ctx: TenantContextValue,
    @Body(new ZodValidationPipe(updateMyEmployeeSchema)) body: UpdateMyEmployeeInput,
  ) {
    // RLS policy employees_self_update_linked permite UPDATE filtrado por
    // app_user_id = sub. WITH CHECK garante que app_user_id não muda.
    const existing = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }
    await ctx.tx.employee.update({
      where: { id: existing.id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
      },
    });
    return this.employee(ctx);
  }

  @Get('employee')
  @ApiOkResponse({
    description:
      'Employee do usuário logado (após auto-link) + barbershop + tenant. 404 se não vinculado.',
  })
  async employee(@Tx() ctx: TenantContextValue) {
    // 1) Find own employee — RLS policy employees_self_select_linked permite
    // (filtra por app.user_id, sem precisar de app.tenant_id).
    const employee = await ctx.tx.employee.findFirst({
      where: { appUserId: ctx.userId },
    });
    if (!employee) {
      throw new NotFoundException(
        'Usuário não vinculado a nenhum funcionário. Use POST /me/employee/link.',
      );
    }

    // 2) Agora que temos o employee, podemos setar app.tenant_id (denormalizado
    // na própria tabela). Isso destrava SELECTs em barbershops/etc.
    await ctx.tx.$executeRaw`SELECT set_config('app.tenant_id', ${employee.tenantId}, true)`;

    // 3) Busca barbershop (RLS tenant-scoped agora funciona) e membership em paralelo.
    const [barbershop, membership] = await Promise.all([
      ctx.tx.barbershop.findUnique({
        where: { id: employee.barbershopId },
        select: { id: true, name: true },
      }),
      ctx.tx.tenantMembership.findFirst({
        where: { userId: ctx.userId, tenantId: employee.tenantId },
        include: { tenant: { select: { id: true, slug: true, name: true, timezone: true } } },
      }),
    ]);

    return {
      employee: {
        id: employee.id,
        displayName: employee.displayName,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
      },
      barbershop: barbershop ?? null,
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
    try {
      if (!user.email) {
        throw new BadRequestException('JWT sem email — auto-link requer email.');
      }

      this.logger.log(`[link] user=${ctx.userId} email=${user.email}`);

      // 1) Se já vinculado, é idempotente — retorna o employee atual.
      const existing = await ctx.tx.employee.findFirst({
        where: { appUserId: ctx.userId },
        select: { id: true, barbershopId: true },
      });
      this.logger.log(`[link] existing=${existing ? existing.id : 'null'}`);
      if (existing) {
        return this.employee(ctx);
      }

      // 2) Busca candidatos: employees não-vinculados com email igual.
      //    SEM include barbershop — Employee já tem tenantId desnormalizado
      //    (ADR-002 §4). Tentar include falharia porque app.tenant_id ainda
      //    não está setado nesta fase.
      const candidates = await ctx.tx.employee.findMany({
        where: { email: user.email, appUserId: null },
      });
      this.logger.log(`[link] candidates=${candidates.length}`);

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
      this.logger.log(`[link] linking employee=${employee.id} tenant=${employee.tenantId}`);

      // 3) Linka: app_user_id ← user.id.
      await ctx.tx.employee.update({
        where: { id: employee.id },
        data: { appUserId: ctx.userId },
      });
      this.logger.log(`[link] employee.update OK`);

      // 4) Sincroniza membership.roles com employee.role (ADR-003 §5:
      //    employee.role = source of truth, membership.roles = derived).
      //    NÃO usa try/catch (erro Postgres aborta tx inteira). Check explicit.
      const derivedRoles = rolesFor(employee.role);
      const existingMembership = await ctx.tx.tenantMembership.findUnique({
        where: {
          userId_tenantId: { userId: ctx.userId, tenantId: employee.tenantId },
        },
        select: { roles: true },
      });
      if (existingMembership) {
        // UPDATE policy tenant_memberships_self_update permite (USING + WITH CHECK
        // = user_id is mine). Sync roles to match employee.role.
        await ctx.tx.tenantMembership.update({
          where: {
            userId_tenantId: { userId: ctx.userId, tenantId: employee.tenantId },
          },
          data: { roles: derivedRoles },
        });
        this.logger.log(
          `[link] membership já existia, roles atualizados de [${existingMembership.roles.join(
            ',',
          )}] pra [${derivedRoles.join(',')}]`,
        );
      } else {
        await ctx.tx.tenantMembership.create({
          data: {
            userId: ctx.userId,
            tenantId: employee.tenantId,
            roles: derivedRoles,
          },
        });
        this.logger.log(`[link] membership.create OK roles=[${derivedRoles.join(',')}]`);
      }

      // 5) Retorna o employee + tenant (this.employee seta app.tenant_id internamente)
      return this.employee(ctx);
    } catch (err) {
      this.logger.error(`[link] FAILED — ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }
}
