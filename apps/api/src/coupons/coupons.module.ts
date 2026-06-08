import { forwardRef, Module } from '@nestjs/common';

import { SlotsModule } from '../slots/slots.module';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsService } from './coupons.service';
import { PublicCouponsController } from './public-coupons.controller';

/**
 * Cupons (ADR-021). PublicCouponsController usa SlotsRepository
 * (resolveTenant/resolveActiveService) → importa SlotsModule. SlotsModule
 * por sua vez usa CouponsService no BookingService → forwardRef quebra o
 * ciclo de módulos.
 */
@Module({
  imports: [forwardRef(() => SlotsModule)],
  controllers: [AdminCouponsController, PublicCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
