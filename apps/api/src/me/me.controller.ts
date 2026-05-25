import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { type AuthenticatedUser, CurrentUser } from '../auth/auth.decorators';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

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
    // tenant_memberships e tenants têm RLS — só retorna o que o user enxerga.
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
}
