import { Module } from '@nestjs/common';

import { SlotsModule } from '../slots/slots.module';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminTimeOffController } from './admin-time-off.controller';

@Module({
  imports: [SlotsModule],
  controllers: [AdminAppointmentsController, AdminTimeOffController],
})
export class AdminModule {}
