import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { TenantContext, type TenantContextValue } from './tenant-context';

/**
 * Injeta o TenantContext atual no handler.
 *
 *   @Get()
 *   list(@Tx() ctx: TenantContextValue) {
 *     return ctx.tx.service.findMany();
 *   }
 *
 * Lança em runtime se o handler não estiver dentro de uma request autenticada
 * — sinal claro de bug (rota deveria ser protegida pelo JwtAuthGuard).
 */
export const Tx = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): TenantContextValue => TenantContext.require(),
);
