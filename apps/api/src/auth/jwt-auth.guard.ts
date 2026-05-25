import { type ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from './auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase-jwt') {
  private static readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(ctx);
  }

  handleRequest<TUser>(err: unknown, user: TUser | false, info: unknown): TUser {
    if (err || !user) {
      const errMsg = err instanceof Error ? err.message : err;
      const infoMsg = info instanceof Error ? info.message : info;
      JwtAuthGuard.logger.warn(
        `JWT rejected — err: ${JSON.stringify(errMsg)} info: ${JSON.stringify(infoMsg)}`,
      );
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user;
  }
}
