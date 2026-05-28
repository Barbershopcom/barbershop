import { Module } from '@nestjs/common';

import { MeAppointmentsController } from './me-appointments.controller';
import { MeCustomerAppointmentsController } from './me-customer-appointments.controller';
import { MeScheduleController } from './me-schedule.controller';
import { MeServicesController } from './me-services.controller';
import { MeController } from './me.controller';

@Module({
  controllers: [
    MeController,
    MeServicesController,
    MeScheduleController,
    MeAppointmentsController,
    MeCustomerAppointmentsController,
  ],
})
export class MeModule {}
