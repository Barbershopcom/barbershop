import { Module } from '@nestjs/common';

import { DebugSentryController } from './debug-sentry.controller';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, DebugSentryController],
})
export class HealthModule {}
