import { Module } from '@nestjs/common';

import { MeScheduleController } from './me-schedule.controller';
import { MeServicesController } from './me-services.controller';
import { MeController } from './me.controller';

@Module({
  controllers: [MeController, MeServicesController, MeScheduleController],
})
export class MeModule {}
