import { Module } from '@nestjs/common';
import { IdempotencyWebhookService } from './idempotency-webhook.service';

/**
 * Módulo compartilhado de serviços comuns.
 */
@Module({
  providers: [IdempotencyWebhookService],
  exports: [IdempotencyWebhookService],
})
export class CommonModule {}
