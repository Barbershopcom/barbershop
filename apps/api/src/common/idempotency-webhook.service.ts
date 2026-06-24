import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Serviço de deduplicação para webhooks.
 * Previne processamento duplicado de eventos re-enviados (network retry, etc).
 *
 * Usa banco como "cache" com TTL 24h via scheduled cleanup.
 * Em produção, substituir por Redis para performance.
 */
@Injectable()
export class IdempotencyWebhookService {
  private static readonly logger = new Logger(IdempotencyWebhookService.name);
  private static readonly WEBHOOK_REQUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se webhook foi já processado (idempotência).
   * Retorna true se é primeiro processamento, false se duplicate.
   */
  async isFirstProcessing(webhookType: string, requestId: string): Promise<boolean> {
    try {
      // Tenta criar registro novo
      await this.prisma.webhookRequest.create({
        data: {
          webhookType,
          requestId,
          processedAt: new Date(),
        },
      });
      return true; // Primeira vez
    } catch (err) {
      // Unique constraint violado (P2002) = já processado. Checa pelo código
      // do Prisma, não pela string da mensagem (frágil entre versões/locales).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        IdempotencyWebhookService.logger.debug(
          `Webhook duplicate detectado: tipo=${webhookType} requestId=${requestId}`,
        );
        return false;
      }
      throw err;
    }
  }

  /**
   * Limpar webhooks antigos (> 24h). Rodar em scheduler diário.
   */
  async cleanupOldRequests(): Promise<number> {
    const cutoff = new Date(Date.now() - IdempotencyWebhookService.WEBHOOK_REQUEST_TTL_MS);
    const result = await this.prisma.webhookRequest.deleteMany({
      where: { processedAt: { lt: cutoff } },
    });
    IdempotencyWebhookService.logger.log(
      `Webhook cleanup: removidos ${result.count} requests antigos`,
    );
    return result.count;
  }
}
