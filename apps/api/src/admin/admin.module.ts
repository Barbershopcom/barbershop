import { Module } from '@nestjs/common';

import { SlotsModule } from '../slots/slots.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminTenantProfileController } from './admin-tenant-profile.controller';
import { AdminTimeOffController } from './admin-time-off.controller';
import { AdminServicesController } from './admin-services.controller';
import { AdminEmployeesController } from './admin-employees.controller';
import { AdminPromotionsController } from './admin-promotions.controller';

@Module({
  imports: [SlotsModule],
  providers: [PrismaService],
  controllers: [
    AdminAppointmentsController,
    AdminTimeOffController,
    AdminTenantProfileController,
    AdminServicesController,
    AdminEmployeesController,
    AdminPromotionsController,
  ],
})
export class AdminModule {}
