import { forwardRef, Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { MockPaymentProvider } from './mock-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

/**
 * Módulo de pagamento (ADR-016 §5). Hoje só o provider mock.
 * Trocar pelo PSP real (S21) = trocar o useClass do PAYMENT_PROVIDER.
 *
 * forwardRef(AppointmentsModule): ciclo mútuo — PaymentService chama
 * AppointmentNotifier.notifyNewPending ao pagar; AppointmentsModule usa
 * PaymentService.refund no estorno.
 *
 * PrismaService é global (PrismaModule), então não precisa importar aqui.
 */
@Module({
  imports: [forwardRef(() => AppointmentsModule)],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    MockPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
