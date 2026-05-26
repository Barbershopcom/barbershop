import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss, type SendOptions } from 'pg-boss';

/**
 * Wrapper sobre pg-boss. Bootstrap em OnModuleInit, shutdown em
 * OnModuleDestroy. Outras services injetam JobsService e chamam
 * `send()` / `work()` / `schedule()`.
 *
 * Decisões (ADR-007):
 *  - DIRECT_URL (sem pgbouncer) — pg-boss usa LISTEN/NOTIFY + advisory
 *    locks que não funcionam via transaction-mode pooler.
 *  - Mesmo processo da API.
 *  - Retry 3x com backoff exponencial é default.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private static readonly logger = new Logger(JobsService.name);
  private boss: PgBoss | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const connectionString = this.config.get<string>('DIRECT_URL');
    if (!connectionString) {
      JobsService.logger.warn(
        'DIRECT_URL não configurado — JobsService desabilitado. Background jobs não vão rodar.',
      );
      return;
    }

    this.boss = new PgBoss({
      connectionString,
      // Schema próprio pra não poluir public.
      schema: 'pgboss',
    });

    this.boss.on('error', (err: unknown) =>
      JobsService.logger.error('pg-boss internal error', err),
    );

    await this.boss.start();
    JobsService.logger.log('pg-boss started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      JobsService.logger.log('Stopping pg-boss...');
      await this.boss.stop({ graceful: true });
      this.boss = null;
    }
  }

  /** Acesso direto pra send/work/schedule. Lança se boss não iniciou. */
  get instance(): PgBoss {
    if (!this.boss) {
      throw new Error('JobsService.instance acessado antes do bootstrap (DIRECT_URL faltando?).');
    }
    return this.boss;
  }

  /** Helper tipado pra enviar job com payload e opções. */
  async send<T extends object>(
    queueName: string,
    payload: T,
    options?: SendOptions,
  ): Promise<string | null> {
    if (!this.boss) {
      JobsService.logger.warn(`send('${queueName}') chamado mas pg-boss desabilitado`);
      return null;
    }
    return this.boss.send(queueName, payload, options ?? {});
  }
}
