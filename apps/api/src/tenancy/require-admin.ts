import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.decorators';
import type { TenantContextValue } from './tenant-context';

/**
 * Valida que o user é admin do tenant da request — via tenant_memberships,
 * que é a fonte de verdade pra autoridade no tenant.
 *
 * Por que membership e não employee.role: o dono que faz onboarding ganha um
 * tenant_membership com role 'admin', mas NÃO um Employee (Employee é só pra
 * quem atende clientes). Validar admin via employee.role dava 403 no dono
 * ("Usuário não vinculado"), porque ele não está na tabela employees.
 *
 * O TenantInterceptor já garantiu que o user tem membership neste tenant
 * (senão a request nem chega aqui) e já setou app.tenant_id. Aqui só
 * confirmamos que esse membership inclui o role 'admin'.
 */
export async function assertTenantAdmin(
  ctx: TenantContextValue,
  user: AuthenticatedUser,
  action = 'acessar essa rota',
): Promise<{ tenantId: string }> {
  if (!ctx.tenantId) {
    throw new ForbiddenException('Header X-Tenant-Id obrigatório.');
  }
  const membership = await ctx.tx.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: ctx.tenantId } },
    select: { roles: true },
  });
  if (!membership) {
    throw new ForbiddenException('Usuário não vinculado a este tenant.');
  }
  if (!membership.roles.includes('admin')) {
    throw new ForbiddenException(`Apenas admin pode ${action}.`);
  }
  return { tenantId: ctx.tenantId };
}
