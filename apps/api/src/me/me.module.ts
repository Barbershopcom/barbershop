import { Module } from '@nestjs/common';

import { MeServicesController } from './me-services.controller';
import { MeController } from './me.controller';

@Module({
  controllers: [MeController, MeServicesController],
})
export class MeModule {}
