import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { TenantContextValue } from './tenant-context';

/**
 * Resolve a unidade (barbershop) alvo de um endpoint admin.
 * - `explicit` (query ?barbershopId=): valida que existe no tenant (RLS já
 *   restringe ao tenant do contexto — outro tenant vira 404).
 * - Sem explicit: 1ª unidade ativa (retrocompat com tenants mono-unidade e
 *   clientes que ainda não mandam o param, ex. mobile-business).
 */
export async function resolveBarbershopId(
  ctx: TenantContextValue,
  explicit?: string,
): Promise<string> {
  if (explicit) {
    const found = await ctx.tx.barbershop.findUnique({
      where: { id: explicit },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Barbershop não encontrado.');
    return found.id;
  }
  const first = await ctx.tx.barbershop.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!first) {
    throw new BadRequestException('Nenhuma barbershop nesse tenant. Complete o onboarding primeiro.');
  }
  return first.id;
}
