import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';

import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { BarbershopHoursModule } from './barbershop-hours/barbershop-hours.module';
import { loadEnv } from './config/env';
import { DiscoverModule } from './discover/discover.module';
import { EmailModule } from './email/email.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MeModule } from './me/me.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { PushModule } from './push/push.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ServicesModule } from './services/services.module';
import { SlotsModule } from './slots/slots.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    // Sentry primeiro pra patchear módulos cedo (ADR-014 §3)
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: loadEnv,
    }),
    // Throttler global — controllers individuais sobrescrevem com @Throttle()
    // pra limites específicos (ex: público mais restrito).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    TenancyModule,
    HealthModule,
    MeModule,
    OnboardingModule,
    ServicesModule,
    EmployeesModule,
    BarbershopHoursModule,
    SlotsModule,
    AdminModule,
    EmailModule,
    JobsModule,
    PushModule,
    PaymentModule,
    AppointmentsModule,
    ReviewsModule,
    DiscoverModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
