import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppointmentsModule } from '../appointments/appointments.module';
import { AdminBillingController } from '../billing/admin-billing.controller';
import { BillingModule } from '../billing/billing.module';
import { CommonModule } from '../common/common.module';
import { AdminMpController } from './admin-mp.controller';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { MercadoPagoProvider } from './mercadopago.provider';
import { MockPaymentProvider } from './mock-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

/**
 * Módulo de pagamento (ADR-016 §5, ADR-022). O provider ativo é escolhido
 * por env PAYMENT_PROVIDER ('mock' em dev/test, 'mercadopago' em prod).
 *
 * forwardRef(AppointmentsModule): ciclo mútuo — PaymentService chama
 * AppointmentNotifier.notifyNewPending ao pagar; AppointmentsModule usa
 * PaymentService.refund no estorno.
 *
 * PrismaService é global (PrismaModule), então não precisa importar aqui.
 */
@Module({
  imports: [forwardRef(() => AppointmentsModule), CommonModule, BillingModule],
  controllers: [PaymentController, MercadoPagoWebhookController, AdminMpController, AdminBillingController],
  providers: [
    PaymentService,
    MockPaymentProvider,
    MercadoPagoProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider, MercadoPagoProvider],
      useFactory: (
        config: ConfigService,
        mock: MockPaymentProvider,
        mp: MercadoPagoProvider,
      ) => (config.get<string>('PAYMENT_PROVIDER') === 'mercadopago' ? mp : mock),
    },
  ],
  exports: [PaymentService, MercadoPagoProvider],
})
export class PaymentModule {}
