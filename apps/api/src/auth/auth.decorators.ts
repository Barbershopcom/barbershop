import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca rota como pública (skip JWT guard global). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthenticatedUser {
  /** Supabase auth user id (UUID). É a coluna `id` em `app_users`. */
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  /** Claims brutos do JWT para uso pontual. */
  raw: Record<string, unknown>;
}

/** Injeta o usuário autenticado no handler: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return req.user;
  },
);
