import { Module } from '@nestjs/common';

import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminTimeOffController } from './admin-time-off.controller';

@Module({
  controllers: [AdminAppointmentsController, AdminTimeOffController],
})
export class AdminModule {}
