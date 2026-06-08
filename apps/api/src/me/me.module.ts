import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { CustomerService } from './customer.service';
import { MeAppointmentsController } from './me-appointments.controller';
import { MeCustomerAppointmentsController } from './me-customer-appointments.controller';
import { MeScheduleController } from './me-schedule.controller';
import { MeServicesController } from './me-services.controller';
import { MeTimeOffController } from './me-time-off.controller';
import { MeController } from './me.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [
    MeController,
    MeServicesController,
    MeScheduleController,
    MeAppointmentsController,
    MeCustomerAppointmentsController,
    MeTimeOffController,
  ],
  providers: [CustomerService],
})
export class MeModule {}
