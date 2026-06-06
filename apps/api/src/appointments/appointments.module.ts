import { Module } from '@nestjs/common';

import { PaymentModule } from '../payment/payment.module';
import { AppointmentStatusService } from './appointment-status.service';

/**
 * Máquina de estados de appointment (ADR-017). PrismaModule é global.
 * Importa PaymentModule pra refund no estorno.
 */
@Module({
  imports: [PaymentModule],
  providers: [AppointmentStatusService],
  exports: [AppointmentStatusService],
})
export class AppointmentsModule {}
