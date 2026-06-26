import { forwardRef, Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PaymentModule } from '../payment/payment.module';
import { CustomerService } from './customer.service';
import {
  EmailVerificationController,
  PublicEmailVerificationController,
} from './email-verification.controller';
import { MeAppointmentsController } from './me-appointments.controller';
import { MeCustomerController } from './me-customer.controller';
import { MeCustomerAppointmentsController } from './me-customer-appointments.controller';
import { MeScheduleController } from './me-schedule.controller';
import { MeServicesController } from './me-services.controller';
import { MeTimeOffController } from './me-time-off.controller';
import { MeController } from './me.controller';

@Module({
  imports: [AppointmentsModule, forwardRef(() => CouponsModule), forwardRef(() => PaymentModule)],
  controllers: [
    MeController,
    MeServicesController,
    MeScheduleController,
    MeAppointmentsController,
    MeCustomerController,
    MeCustomerAppointmentsController,
    MeTimeOffController,
    EmailVerificationController,
    PublicEmailVerificationController,
  ],
  providers: [CustomerService],
})
export class MeModule {}
