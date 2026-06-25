import { Module } from '@nestjs/common';

import { PaymentModule } from '../payment/payment.module';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [PaymentModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
