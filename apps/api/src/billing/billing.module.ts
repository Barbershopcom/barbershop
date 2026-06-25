import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
