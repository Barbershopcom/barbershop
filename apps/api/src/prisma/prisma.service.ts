import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Connect com retry/backoff exponencial.
 *
 * Neon serverless autosuspende por inatividade, então o primeiro $connect()
 * de um deploy "frio" pode falhar com P1001 antes do compute acordar. Sem
 * retry, o boot inteiro crasha e o Railway marca o deploy como falho. O retry
 * tolera o cold start; falha persistente ainda derruba (fail-fast) pra não
 * mascarar banco realmente fora do ar.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly MAX_DELAY_MS = 8_000;

  async onModuleInit(): Promise<void> {
    const { MAX_ATTEMPTS, MAX_DELAY_MS } = PrismaService;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Conectado ao banco na tentativa ${attempt}.`);
        }
        return;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          this.logger.error(`Falha ao conectar ao banco após ${MAX_ATTEMPTS} tentativas.`);
          throw err;
        }
        const delayMs = Math.min(1_000 * 2 ** (attempt - 1), MAX_DELAY_MS);
        this.logger.warn(
          `Banco inacessível (tentativa ${attempt}/${MAX_ATTEMPTS}). Retry em ${delayMs}ms.`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
