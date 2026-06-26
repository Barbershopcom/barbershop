import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/auth.decorators';
import {
  decodeEmailVerifyToken,
  encodeEmailVerifyToken,
} from '../common/email-verify-token';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

/** Verificação de email "soft" (não bloqueia login) — autenticado. */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/email')
export class EmailVerificationController {
  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  async status(@Tx() ctx: TenantContextValue): Promise<{ emailVerified: boolean }> {
    const u = await ctx.tx.appUser.findUnique({
      where: { id: ctx.userId },
      select: { emailVerified: true },
    });
    return { emailVerified: u?.emailVerified ?? false };
  }

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  async send(@Tx() ctx: TenantContextValue): Promise<{ ok: boolean }> {
    const u = await ctx.tx.appUser.findUnique({
      where: { id: ctx.userId },
      select: { email: true, emailVerified: true },
    });
    if (!u?.email || u.emailVerified) return { ok: true }; // nada a fazer
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET') ?? 'dev';
    const token = encodeEmailVerifyToken(
      { userId: ctx.userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS },
      secret,
    );
    const webUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? 'https://appbarbeariab.com';
    await this.email.sendEmailVerification({
      to: u.email,
      verifyUrl: `${webUrl}/verify-email?token=${encodeURIComponent(token)}`,
    });
    return { ok: true };
  }
}

/** Confirmação via link do email — público (sem sessão). */
@ApiTags('public')
@Controller('public/email')
export class PublicEmailVerificationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async verify(@Body() body: { token?: string }): Promise<{ ok: boolean }> {
    if (!body?.token) return { ok: false };
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET') ?? 'dev';
    const decoded = decodeEmailVerifyToken(body.token, secret);
    if (!decoded.ok) return { ok: false };
    // Endpoint público (sem TenantInterceptor) roda no role default (BYPASSRLS),
    // então os updates abaixo funcionam sem sessão.
    await this.prisma.appUser.update({
      where: { id: decoded.payload.userId },
      data: { emailVerified: true },
    });
    // Ativa as barbearias pendentes que esse dono administra.
    await this.prisma.$executeRaw`
      UPDATE tenants SET status = 'active', updated_at = now()
      WHERE status = 'pending'
        AND id IN (
          SELECT tenant_id FROM tenant_memberships
          WHERE user_id = ${decoded.payload.userId}::uuid AND 'admin' = ANY(roles)
        )
    `;
    return { ok: true };
  }
}
