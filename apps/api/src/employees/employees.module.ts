import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [BillingModule],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
