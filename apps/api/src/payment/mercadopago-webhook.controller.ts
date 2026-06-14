import { createHmac, timingSafeEqual } from 'node:crypto';
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
import { PrismaService } from '../prisma/prisma.service';
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

    if (!this.verifySignature(dataId, xRequestId, xSignature)) {
      MercadoPagoWebhookController.logger.warn(
        `Assinatura inválida no webhook MP (payment ${dataId}) — ignorado.`,
      );
      return { ok: true }; // 200 pra não gerar retry infinito de spoof
    }

    try {
      // Descobre o appointment (external_reference) e o token do vendedor.
      const existing = await this.prisma.payment.findFirst({
        where: { providerPaymentId: dataId },
        select: { appointmentId: true, tenantId: true },
      });
      let sellerToken: string | undefined;
      if (existing) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: existing.tenantId },
          select: { mpAccessToken: true },
        });
        sellerToken = tenant?.mpAccessToken ?? undefined;
      }

      const mp = await this.provider.getPayment(dataId, sellerToken);
      const appointmentId =
        existing?.appointmentId ?? (mp.external_reference as string | undefined);
      if (!appointmentId) return { ok: true };

      if (mp.status === 'approved') {
        await this.payments.markPaid(appointmentId, mp as Record<string, unknown>);
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
   * Sem secret configurado, não valida (dev) — loga e aceita.
   */
  private verifySignature(
    dataId: string,
    xRequestId: string | undefined,
    xSignature: string | undefined,
  ): boolean {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      // Fail-closed em produção: sem secret, NÃO aceita (evita markPaid forjado).
      // Em dev/sandbox sem secret configurado, permite pra facilitar o teste.
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      if (isProd) {
        MercadoPagoWebhookController.logger.error(
          'MERCADOPAGO_WEBHOOK_SECRET ausente em produção — webhook rejeitado.',
        );
      }
      return !isProd;
    }
    if (!xSignature) return false;

    const parts: Record<string, string> = {};
    for (const kv of xSignature.split(',')) {
      const idx = kv.indexOf('=');
      if (idx === -1) continue;
      parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
    }
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
      return false;
    }
  }
}
