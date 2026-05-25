import { Module } from '@nestjs/common';

import { BarbershopHoursController } from './barbershop-hours.controller';

@Module({
  controllers: [BarbershopHoursController],
})
export class BarbershopHoursModule {}
