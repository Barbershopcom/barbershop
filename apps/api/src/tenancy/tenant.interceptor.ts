import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { firstValueFrom, from, type Observable } from 'rxjs';

import type { AuthenticatedUser } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from './tenant-context';

/**
 * Intercepta toda request autenticada e abre uma transação Prisma com:
 *   1) SET LOCAL ROLE app_user      (NOBYPASSRLS — faz as policies valerem)
 *   2) SET LOCAL app.user_id        (sub do JWT)
 *   3) INSERT ON CONFLICT em app_users (lazy sync, idempotente)
 *   4) SET LOCAL app.tenant_id      (se request resolveu um tenant)
 *
 * O handler do controller roda dentro dessa transação via TenantContext.
 * Erros propagados disparam rollback automático.
 *
 * Rotas públicas (sem req.user) passam direto sem abrir transação.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private static readonly logger = new Logger(TenantInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;

    if (!user) {
      // Rota pública — sem tenant context, sem transação.
      return next.handle();
    }

    return from(this.runWithContext(user, req, next));
  }

  private async runWithContext(
    user: AuthenticatedUser,
    req: Request,
    next: CallHandler,
  ): Promise<unknown> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
        await tx.$executeRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
        // app.user_email habilita as policies de auto-link de Employee.
        // Ver migration 20260525172531_employee_self_link_rls.
        await tx.$executeRaw`SELECT set_config('app.user_email', ${user.email ?? ''}, true)`;

        // Lazy sync: garante que app_users tem linha pra esse user.
        // Policy app_users_self_insert exige id = current_setting('app.user_id'),
        // o que já foi setado acima.
        await tx.$executeRaw`
          INSERT INTO app_users (id, email, phone_e164, updated_at)
          VALUES (${user.id}::uuid, ${user.email ?? null}, ${user.phone ?? null}, now())
          ON CONFLICT (id) DO NOTHING
        `;

        const tenantId = this.extractTenantId(req);
        if (tenantId) {
          const ok = await this.userHasMembership(tx, user.id, tenantId);
          if (!ok) {
            TenantInterceptor.logger.warn(
              `user=${user.id} tentou acessar tenant=${tenantId} sem membership`,
            );
            throw new ForbiddenException('Sem acesso a esse tenant');
          }
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        }

        return TenantContext.run(
          { userId: user.id, tenantId: tenantId ?? null, tx },
          () => firstValueFrom(next.handle()),
        );
      },
      {
        // Default Prisma é 5s; com Neon + pgbouncer pooler em transaction mode,
        // múltiplas queries sequenciais dentro do tx às vezes excedem.
        // 30s dá folga em cold start sem mascarar bug real.
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  }

  /**
   * Resolve tenant a partir de:
   *   1) header X-Tenant-Id
   *   2) param de rota :tenantId
   *   3) (futuro: subdomain ou path /b/[slug])
   * Retorna null se nenhum desses estiver presente — request user-scoped (ex: /me, /me/tenants).
   */
  private extractTenantId(req: Request): string | null {
    const fromHeader = req.headers['x-tenant-id'];
    if (typeof fromHeader === 'string' && fromHeader.length > 0) return fromHeader;

    const fromParam = (req.params as Record<string, string | undefined>)?.tenantId;
    if (fromParam) return fromParam;

    return null;
  }

  private async userHasMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    // Query através do RLS — tenant_memberships filtra por app.user_id já setado.
    const found = await tx.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { tenantId: true },
    });
    return !!found;
  }
}
