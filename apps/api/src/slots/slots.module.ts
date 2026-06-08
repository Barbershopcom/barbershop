import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { CustomerCancelController } from './customer-cancel.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

@Module({
  imports: [ReviewsModule],
  controllers: [
    SlotsController,
    BookingController,
    CustomerCancelController,
    PublicTenantsController,
  ],
  providers: [SlotsService, SlotsRepository, BookingService],
  exports: [BookingService],
})
export class SlotsModule {}
