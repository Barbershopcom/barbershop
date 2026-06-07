import { forwardRef, Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { PaymentModule } from '../payment/payment.module';
import { PushModule } from '../push/push.module';
import { AppointmentNotifier } from './appointment-notifier.service';
import { AppointmentStatusService } from './appointment-status.service';

/**
 * Máquina de estados de appointment (ADR-017). PrismaModule é global.
 * - PaymentModule (forwardRef): refund no estorno. Ciclo mútuo porque
 *   PaymentService chama AppointmentNotifier.notifyNewPending ao pagar.
 * - EmailModule + PushModule: notificações das transições.
 */
@Module({
  imports: [forwardRef(() => PaymentModule), EmailModule, PushModule],
  providers: [AppointmentStatusService, AppointmentNotifier],
  exports: [AppointmentStatusService, AppointmentNotifier],
})
export class AppointmentsModule {}
