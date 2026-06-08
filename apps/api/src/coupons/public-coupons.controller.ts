import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type CouponValidationResult,
  type ValidateCouponInput,
  validateCouponSchema,
} from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SlotsRepository } from '../slots/slots.repository';
import { CouponsService } from './coupons.service';

/**
 * Preview público de cupom no booking (ADR-021 §5). Sem auth, bypassRLS +
 * filtro explícito por tenant (resolveTenant). É só UX — o `book`
 * re-valida server-side (fonte de verdade).
 */
@ApiTags('public-coupons')
@Public()
@Controller('public/tenants/:slug/coupons')
export class PublicCouponsController {
  constructor(
    private readonly repo: SlotsRepository,
    private readonly coupons: CouponsService,
  ) {}

  @Post('validate')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiParam({ name: 'slug', description: 'Slug público da barbearia.' })
  @ApiOkResponse({ description: 'Validação + desconto previsto do cupom.' })
  async validate(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(validateCouponSchema)) body: ValidateCouponInput,
  ): Promise<CouponValidationResult> {
    const tenant = await this.repo.resolveTenant(slug);
    const service = await this.repo.resolveActiveService(tenant.id, body.serviceId);
    const { couponId: _couponId, ...result } = await this.coupons.validateByCode(
      tenant.id,
      body.code,
      service.basePriceCents,
      new Date(),
    );
    return result;
  }
}
