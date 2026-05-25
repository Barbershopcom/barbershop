import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { BarbershopHoursModule } from './barbershop-hours/barbershop-hours.module';
import { loadEnv } from './config/env';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: loadEnv,
    }),
    PrismaModule,
    AuthModule,
    TenancyModule,
    HealthModule,
    MeModule,
    OnboardingModule,
    ServicesModule,
    EmployeesModule,
    BarbershopHoursModule,
  ],
})
export class AppModule {}
