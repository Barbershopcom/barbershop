import { Module } from '@nestjs/common';

import { AdminAppointmentsController } from './admin-appointments.controller';

@Module({
  controllers: [AdminAppointmentsController],
})
export class AdminModule {}
