import { Module } from '@nestjs/common';

import { CustomerService } from '../me/customer.service';
import { MeBarberReviewsController } from './me-barber-reviews.controller';
import { MeReviewsController } from './me-reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [MeReviewsController, MeBarberReviewsController],
  providers: [ReviewsService, CustomerService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
