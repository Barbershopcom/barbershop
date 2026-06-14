import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  RefundInput,
} from './payment-provider';

/** 10 minutos pro Pix expirar (ADR-022 §3). */
const PIX_EXPIRATION_MS = 10 * 60 * 1000;

export interface OAuthTokenResult {
  access_token: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number; // segundos
  [k: string]: unknown;
}

interface MpPaymentResponse {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded
  status_detail?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  [k: string]: unknown;
}

/**
 * Provider Mercado Pago via REST API (ADR-022). Marketplace/split: cobra na
 * conta do vendedor (sellerAccessToken) com `application_fee` = comissão da
 * plataforma. Sem SDK — só `fetch`. Pix é o foco (sem taxa, em destaque);
 * cartão usa token gerado no cliente (MP.js).
 *
 * `charge()` devolve `pending` no Pix (confirma via webhook → markPaid).
 */
@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago';
  private static readonly logger = new Logger(MercadoPagoProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('MERCADOPAGO_BASE_URL') ?? 'https://api.mercadopago.com';
  }

  /** Token do vendedor (marketplace) ou, em fallback, o da plataforma. */
  private tokenFor(input: { sellerAccessToken?: string }): string {
    const token = input.sellerAccessToken ?? this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) {
      throw new Error('Sem access token do Mercado Pago (vendedor não conectou a conta).');
    }
    return token;
  }

  private notificationUrl(): string | undefined {
    const api = this.config.get<string>('API_PUBLIC_URL');
    return api ? `${api.replace(/\/$/, '')}/webhooks/mercadopago` : undefined;
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.method === 'pix') return this.chargePix(input);
    return this.chargeCard(input);
  }

  private async chargePix(input: ChargeInput): Promise<ChargeResult> {
    const body: Record<string, unknown> = {
      transaction_amount: centsToReais(input.amountCents),
      description: input.description,
      payment_method_id: 'pix',
      payer: { email: input.payerEmail ?? 'comprador@email.com' },
      external_reference: input.appointmentId,
      date_of_expiration: new Date(Date.now() + PIX_EXPIRATION_MS).toISOString(),
    };
    if (input.applicationFeeCents) body.application_fee = centsToReais(input.applicationFeeCents);
    const notif = this.notificationUrl();
    if (notif) body.notification_url = notif;

    const mp = await this.post('/v1/payments', body, this.tokenFor(input), input.appointmentId);
    const td = mp.point_of_interaction?.transaction_data;
    return {
      providerPaymentId: String(mp.id),
      status: mapStatus(mp.status),
      payload: mp as Record<string, unknown>,
      pixQrCode: td?.qr_code,
      pixQrCodeBase64: td?.qr_code_base64,
    };
  }

  private async chargeCard(input: ChargeInput): Promise<ChargeResult> {
    if (!input.cardToken) {
      throw new Error('Pagamento com cartão exige card_token (tokenizado no cliente via MP.js).');
    }
    const body: Record<string, unknown> = {
      transaction_amount: centsToReais(input.amountCents),
      description: input.description,
      token: input.cardToken,
      installments: input.installments ?? 1,
      payer: { email: input.payerEmail ?? 'comprador@email.com' },
      external_reference: input.appointmentId,
    };
    if (input.applicationFeeCents) body.application_fee = centsToReais(input.applicationFeeCents);
    const notif = this.notificationUrl();
    if (notif) body.notification_url = notif;

    const mp = await this.post('/v1/payments', body, this.tokenFor(input), input.appointmentId);
    if (mp.status === 'rejected' || mp.status === 'cancelled') {
      throw new Error(`Cartão recusado (${mp.status_detail ?? mp.status}).`);
    }
    return {
      providerPaymentId: String(mp.id),
      status: mapStatus(mp.status),
      payload: mp as Record<string, unknown>,
    };
  }

  async refund(input: RefundInput): Promise<void> {
    // Refund total — o MP estorna proporcionalmente o application_fee.
    await this.post(
      `/v1/payments/${input.providerPaymentId}/refunds`,
      {},
      this.tokenFor(input),
      `refund_${input.providerPaymentId}`,
    );
    MercadoPagoProvider.logger.log(`Refund MP solicitado pra ${input.providerPaymentId}`);
  }

  // ── OAuth MP Connect (marketplace) — ADR-022 §2/Fase 4 ──────────────

  /** URL de autorização pra barbearia conectar a conta MP. */
  getAuthorizationUrl(state: string): string {
    const clientId = this.config.get<string>('MERCADOPAGO_CLIENT_ID');
    const redirect = this.config.get<string>('MERCADOPAGO_OAUTH_REDIRECT_URI');
    const params = new URLSearchParams({
      client_id: clientId ?? '',
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: redirect ?? '',
    });
    return `https://auth.mercadopago.com.br/authorization?${params.toString()}`;
  }

  /** Troca o `code` do OAuth pelos tokens do vendedor. */
  async exchangeOAuthCode(code: string): Promise<OAuthTokenResult> {
    return this.oauthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.get<string>('MERCADOPAGO_OAUTH_REDIRECT_URI') ?? '',
    });
  }

  /** Renova o access_token do vendedor via refresh_token. */
  async refreshOAuthToken(refreshToken: string): Promise<OAuthTokenResult> {
    return this.oauthToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async oauthToken(extra: Record<string, string>): Promise<OAuthTokenResult> {
    const body = {
      client_id: this.config.get<string>('MERCADOPAGO_CLIENT_ID'),
      client_secret: this.config.get<string>('MERCADOPAGO_CLIENT_SECRET'),
      ...extra,
    };
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as OAuthTokenResult & { message?: string };
    if (!res.ok || !json.access_token) {
      MercadoPagoProvider.logger.error(`MP OAuth token → ${res.status}`);
      throw new Error('Falha ao conectar a conta Mercado Pago.');
    }
    return json;
  }

  /** Busca um pagamento (usado pelo webhook — fonte de verdade). */
  async getPayment(providerPaymentId: string, sellerAccessToken?: string): Promise<MpPaymentResponse> {
    const res = await fetch(`${this.baseUrl}/v1/payments/${providerPaymentId}`, {
      headers: { authorization: `Bearer ${this.tokenFor({ sellerAccessToken })}` },
    });
    if (!res.ok) {
      throw new Error(`MP getPayment ${providerPaymentId} → ${res.status}`);
    }
    return (await res.json()) as MpPaymentResponse;
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
    token: string,
    idempotencyKey: string,
  ): Promise<MpPaymentResponse> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as MpPaymentResponse;
    if (!res.ok) {
      MercadoPagoProvider.logger.error(
        `MP POST ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
      );
      throw new Error(`Mercado Pago recusou a operação (${res.status}).`);
    }
    return json;
  }
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

/** Mapeia status do MP pro contrato do PaymentProvider (paid|pending). */
function mapStatus(mpStatus: string): 'paid' | 'pending' {
  return mpStatus === 'approved' ? 'paid' : 'pending';
}
