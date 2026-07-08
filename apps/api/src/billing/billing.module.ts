import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingService } from './billing.service';
import { PlanLimitsService } from './plan-limits.service';

@Module({
  imports: [PrismaModule],
  providers: [BillingService, PlanLimitsService],
  exports: [BillingService, PlanLimitsService],
})
export class BillingModule {}
