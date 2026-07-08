import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { AdminUnitsController } from './admin-units.controller';

@Module({
  imports: [BillingModule],
  controllers: [AdminUnitsController],
})
export class UnitsModule {}
