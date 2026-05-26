import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';

/**
 * Global pra evitar declarar imports em cada module que dispara email
 * (BookingService, AdminAppointmentsController, CustomerCancelController).
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
