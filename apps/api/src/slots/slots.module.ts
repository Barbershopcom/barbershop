import { forwardRef, Module } from '@nestjs/common';

import { CouponsModule } from '../coupons/coupons.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { CustomerCancelController } from './customer-cancel.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

@Module({
  imports: [ReviewsModule, forwardRef(() => CouponsModule)],
  controllers: [
    SlotsController,
    BookingController,
    CustomerCancelController,
    PublicTenantsController,
  ],
  providers: [SlotsService, SlotsRepository, BookingService],
  exports: [BookingService, SlotsRepository],
})
export class SlotsModule {}
