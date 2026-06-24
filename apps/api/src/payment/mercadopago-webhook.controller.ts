import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../auth/auth.decorators';
import { IdempotencyWebhookService } from '../common/idempotency-webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyMpWebhookSignature } from './mercadopago-signature';
import { MercadoPagoProvider } from './mercadopago.provider';
import { PaymentService } from './payment.service';

/**
 * Webhook do Mercado Pago (ADR-022 §4). Público (o MP chama).
 *
 * Segurança: valida a assinatura `x-signature` (HMAC do manifesto
 * id;request-id;ts) E re-busca o pagamento na API do MP — não confia no
 * corpo. Idempotente: markPaid/markFailed são no-op se já no estado final.
 * Responde 200 rápido; o MP reenfileira em caso de erro.
 */
@Public()
@Controller('webhooks/mercadopago')
export class MercadoPagoWebhookController {
  private static readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly provider: MercadoPagoProvider,
    private readonly payments: PaymentService,
    private readonly prisma: PrismaService,
    private readonly webhookIdempotency: IdempotencyWebhookService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handle(
    @Req() req: Request,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query('type') type: string | undefined,
    @Query('data.id') dataIdQuery: string | undefined,
  ): Promise<{ ok: true }> {
    const body = (req.body ?? {}) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };
    const eventType = type ?? body.type ?? body.action;
    const dataId = String(dataIdQuery ?? body.data?.id ?? '');

    // Só nos interessa evento de pagamento.
    if (!dataId || !(eventType?.includes('payment'))) {
      return { ok: true };
    }

    // 1. Validar assinatura PRIMEIRO (antes de dedup)
    // Só webhooks autenticados podem ser dedupados.
    if (!this.verifySignature(dataId, xRequestId, xSignature)) {
      MercadoPagoWebhookController.logger.warn(
        `Assinatura inválida no webhook MP (payment ${dataId}) — ignorado.`,
      );
      return { ok: true }; // 200 pra não gerar retry infinito de spoof
    }

    // 2. Deduplicação DEPOIS da signature verification
    // Evita reprocessamento se MP re-envia webhook autenticado
    if (xRequestId) {
      const isFirst = await this.webhookIdempotency.isFirstProcessing(
        'mercadopago_payment',
        xRequestId,
      );
      if (!isFirst) {
        // Já processado — responde 200 sem fazer nada
        return { ok: true };
      }
    }

    try {
      // C2 (segurança): exige que já exista um Payment local gravado na
      // hora da cobrança (pay()) com providerPaymentId === dataId.
      // Se não existir, o webhook é de um pagamento que nunca foi criado
      // por nós — pode ser forjado. No-op imediato, sem chamar getPayment
      // com o token da plataforma.
      const existing = await this.prisma.payment.findFirst({
        where: { providerPaymentId: dataId },
        select: { appointmentId: true, tenantId: true },
      });
      if (!existing) {
        MercadoPagoWebhookController.logger.warn(
          `Webhook MP ignorado — nenhum Payment local para providerPaymentId=${dataId}. ` +
            `Possível webhook forjado ou pagamento externo; requer reconciliação manual.`,
        );
        return { ok: true };
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: existing.tenantId },
        select: { mpAccessToken: true },
      });
      const sellerToken = tenant?.mpAccessToken ?? undefined;

      const mp = await this.provider.getPayment(dataId, sellerToken);
      // appointmentId vem SEMPRE do registro local (nunca de external_reference
      // buscado via token de plataforma — C2).
      const appointmentId = existing.appointmentId;

      if (mp.status === 'approved') {
        await this.payments.markPaid(
          appointmentId,
          mp as Record<string, unknown>,
          // C1: repassa valor/moeda verificados do MP para validação em markPaid.
          {
            transactionAmount: mp.transaction_amount as number,
            currencyId: mp.currency_id as string,
          },
        );
      } else if (mp.status === 'rejected' || mp.status === 'cancelled') {
        await this.payments.markFailed(appointmentId);
      }
      // pending/in_process → ainda aguardando; não faz nada.
    } catch (err) {
      MercadoPagoWebhookController.logger.error(
        `Falha processando webhook MP (payment ${dataId}): ${err instanceof Error ? err.message : err}`,
      );
      // Mesmo assim 200: o MP reenvia; e erro transitório não deve spammar.
    }
    return { ok: true };
  }

  /**
   * Verifica a assinatura do MP. Header `x-signature: ts=...,v1=...`.
   * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
   * Sem secret em produção = falha. Em dev, usa mock token.
   */
  private verifySignature(
    dataId: string,
    xRequestId: string | undefined,
    xSignature: string | undefined,
  ): boolean {
    let secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (!secret) {
      // Produção sem secret = rejeita (fail-closed, evita markPaid forjado)
      if (isProd) {
        MercadoPagoWebhookController.logger.error(
          'MERCADOPAGO_WEBHOOK_SECRET ausente em produção — webhook rejeitado.',
        );
        return false;
      }
      // Dev/test: usa mock token pra facilitar testes sem fail-open
      secret = 'mock-webhook-secret-dev-only';
      MercadoPagoWebhookController.logger.debug(
        'Usando mock webhook secret em desenvolvimento.',
      );
    }

    return verifyMpWebhookSignature({ secret, dataId, xRequestId, xSignature });
  }
}
