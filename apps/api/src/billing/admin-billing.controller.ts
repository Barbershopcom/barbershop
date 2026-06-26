import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { MercadoPagoProvider } from '../payment/mercadopago.provider';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/subscription')
export class AdminBillingController {
  constructor(private readonly mp: MercadoPagoProvider) {}

  @Get()
  async get(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'ver a assinatura');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (!sub) return null;
    return {
      status: sub.status,
      billingCycle: sub.billingCycle,
      priceCents: sub.priceCents,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  @Post('update-card')
  @HttpCode(HttpStatus.OK)
  async updateCard(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { cardTokenId?: string },
  ) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'atualizar o cartão');
    if (!body.cardTokenId) throw new BadRequestException('cardTokenId obrigatório.');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (!sub?.mpPreapprovalId) throw new BadRequestException('Assinatura sem preapproval ativo.');
    await this.mp.updatePreapprovalCard(sub.mpPreapprovalId, body.cardTokenId);
    return { ok: true };
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'cancelar a assinatura');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (sub?.mpPreapprovalId) await this.mp.cancelPreapproval(sub.mpPreapprovalId);
    await ctx.tx.subscription.update({ where: { tenantId }, data: { status: 'cancelled' } });
    return { ok: true };
  }
}
