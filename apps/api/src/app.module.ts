import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { loadEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
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
  ],
})
export class AppModule {}
