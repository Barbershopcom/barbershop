import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  BILLING_TIERS,
  type BillingCycle,
  limitsForTier,
  planForTier,
  type PlanTier,
  priceForTier,
  usageFitsTier,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { MercadoPagoProvider } from '../payment/mercadopago.provider';
import { assertTenantAdmin } from '../tenancy/require-admin';
import { type TenantContextValue } from '../tenancy/tenant-context';
import { Tx } from '../tenancy/tenancy.decorators';
import { PlanLimitsService } from './plan-limits.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/subscription')
export class AdminBillingController {
  constructor(
    private readonly mp: MercadoPagoProvider,
    private readonly planLimits: PlanLimitsService,
  ) {}

  @Get()
  async get(@Tx() ctx: TenantContextValue, @CurrentUser() user: AuthenticatedUser) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'ver a assinatura');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (!sub) return null;
    return {
      tier: sub.tier,
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

  /**
   * Troca de plano mantendo o ciclo de cobrança atual.
   * - Downgrade só se o uso atual (unidades/funcionários) couber no tier alvo.
   * - pago→pago: atualiza o valor do preapproval no MP.
   * - pago→free: cancela o preapproval.
   * - free→pago: exige cartão e cria preapproval SEM trial (anti-abuso).
   */
  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  async changePlan(
    @Tx() ctx: TenantContextValue,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { tier?: string; cardTokenId?: string },
  ) {
    const { tenantId } = await assertTenantAdmin(ctx, user, 'alterar o plano');
    const tier = body.tier as PlanTier;
    if (!tier || !(tier in BILLING_TIERS)) throw new BadRequestException('Tier inválido.');
    const sub = await ctx.tx.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new BadRequestException('Assinatura não encontrada.');
    if (sub.tier === tier) throw new BadRequestException('Esse já é o seu plano atual.');

    const usage = await this.planLimits.tenantUsage(ctx.tx, tenantId);
    if (!usageFitsTier(tier, usage)) {
      const limits = limitsForTier(tier);
      const resource = usage.units > limits.maxUnits ? 'unit' : 'employee';
      throw new ConflictException({
        code: 'PLAN_LIMIT_REACHED',
        resource,
        limit: resource === 'unit' ? limits.maxUnits : limits.maxEmployeesPerUnit,
        current: resource === 'unit' ? usage.units : usage.maxEmployeesInAnyUnit,
        tier,
        message: 'Desative unidades ou funcionários excedentes antes de fazer downgrade.',
      });
    }

    const cycle = sub.billingCycle as BillingCycle;
    const priceCents = priceForTier(tier, cycle);

    if (tier === 'free') {
      if (sub.mpPreapprovalId) await this.mp.cancelPreapproval(sub.mpPreapprovalId);
      await ctx.tx.subscription.update({
        where: { tenantId },
        data: { tier, priceCents: 0, status: 'active', mpPreapprovalId: null, trialEndsAt: null },
      });
      return { ok: true, tier, priceCents: 0 };
    }

    if (sub.mpPreapprovalId) {
      await this.mp.updatePreapprovalAmount(sub.mpPreapprovalId, priceCents);
      await ctx.tx.subscription.update({ where: { tenantId }, data: { tier, priceCents } });
      return { ok: true, tier, priceCents };
    }

    // free → pago: precisa de cartão; sem novo trial.
    if (!body.cardTokenId) throw new BadRequestException('Cartão obrigatório para planos pagos.');
    const owner = await ctx.tx.appUser.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (!owner?.email) throw new BadRequestException('Conta sem email.');
    const tenant = await ctx.tx.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const plan = planForTier(tier, cycle);
    const pre = await this.mp.createPreapproval({
      reason: `Assinatura Navalha — ${tenant?.name ?? 'Barbearia'}`,
      externalReference: tenantId,
      payerEmail: owner.email,
      cardTokenId: body.cardTokenId,
      amountCents: plan.priceCents,
      frequency: plan.mpFrequency,
      frequencyType: plan.mpFrequencyType,
      trialDays: 0,
      backUrl: `${process.env.PUBLIC_WEB_URL ?? 'https://appbarbeariab.com'}/admin/assinatura`,
    });
    await ctx.tx.subscription.update({
      where: { tenantId },
      data: { tier, priceCents, status: 'active', mpPreapprovalId: pre.id },
    });
    return { ok: true, tier, priceCents };
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
