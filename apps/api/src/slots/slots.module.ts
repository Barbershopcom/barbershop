import { Module } from '@nestjs/common';

import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { CustomerCancelController } from './customer-cancel.controller';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

@Module({
  controllers: [SlotsController, BookingController, CustomerCancelController],
  providers: [SlotsService, SlotsRepository, BookingService],
})
export class SlotsModule {}
