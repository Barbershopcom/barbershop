import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';
import { MercadoPagoProvider } from './mercadopago.provider';

/**
 * MP Connect (ADR-022 §2/Fase 4) — admin conecta a conta Mercado Pago da
 * barbearia pro split. Tokens são segredos: nunca retornados em GET.
 *
 * Fluxo: GET /connect-url → admin abre no MP e autoriza → MP redireciona
 * pro web com ?code&state → web POSTa /connect → troca code por tokens.
 * `state` é assinado (HMAC) com o tenantId → CSRF + amarra ao tenant certo.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/mp')
export class AdminMpController {
  constructor(
    private readonly config: ConfigService,
    private readonly mp: MercadoPagoProvider,
  ) {}

  private requireAdmin(
    ctx: TenantContextValue,
    user: AuthenticatedUser,
  ): Promise<{ tenantId: string }> {
    return assertTenantAdmin(ctx, user, 'conectar o Mercado Pago');
  }

  /** Secret pra assinar o `state` do OAuth (reusa o do cancel — sempre presente). */
  private signState(tenantId: string): string {
    const secret = this.config.get<string>('APPOINTMENT_CANCEL_SECRET') ?? 'dev';
    const sig = createHmac('sha256', secret).update(`mp:${tenantId}`).digest('hex').slice(0, 32);
    return `${tenantId}.${sig}`;
  }

  private verifyState(state: string): string | null {
    const dot = state.lastIndexOf('.');
    if (dot === -1) return null;
    const tenantId = state.slice(0, dot);
    const expected = this.signState(tenantId);
    try {
      return timingSafeEqual(Buffer.from(state), Buffer.from(expected)) ? tenantId : null;
    } catch {
      return null;
    }
  }

  @Get('status')
  @ApiOkResponse({ description: 'Se a conta MP do tenant está conectada (sem expor tokens).' })
  async status(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const admin = await this.requireAdmin(ctx, user);
    const tenant = await ctx.tx.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { mpUserId: true, mpConnectedAt: true },
    });
    return {
      connected: Boolean(tenant?.mpConnectedAt),
      mpUserId: tenant?.mpUserId ?? null,
      connectedAt: tenant?.mpConnectedAt?.toISOString() ?? null,
    };
  }

  @Get('connect-url')
  @ApiOkResponse({ description: 'URL de autorização do MP Connect (state assinado).' })
  async connectUrl(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const admin = await this.requireAdmin(ctx, user);
    return { url: this.mp.getAuthorizationUrl(this.signState(admin.tenantId)) };
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Troca o code do OAuth e armazena os tokens do vendedor.' })
  async connect(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { code?: string; state?: string },
  ) {
    const admin = await this.requireAdmin(ctx, user);
    if (!body.code || !body.state) {
      throw new BadRequestException('code e state são obrigatórios.');
    }
    const stateTenant = this.verifyState(body.state);
    if (!stateTenant || stateTenant !== admin.tenantId) {
      throw new ForbiddenException('state inválido (CSRF) ou de outro tenant.');
    }

    const tokens = await this.mp.exchangeOAuthCode(body.code);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await ctx.tx.tenant.update({
      where: { id: admin.tenantId },
      data: {
        mpUserId: tokens.user_id != null ? String(tokens.user_id) : null,
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token ?? null,
        mpTokenExpiresAt: expiresAt,
        mpConnectedAt: new Date(),
      },
    });
    return { connected: true, mpUserId: tokens.user_id != null ? String(tokens.user_id) : null };
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Desconecta a conta MP (limpa os tokens).' })
  async disconnect(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const admin = await this.requireAdmin(ctx, user);
    await ctx.tx.tenant.update({
      where: { id: admin.tenantId },
      data: {
        mpUserId: null,
        mpAccessToken: null,
        mpRefreshToken: null,
        mpTokenExpiresAt: null,
        mpConnectedAt: null,
      },
    });
    return { connected: false };
  }
}
