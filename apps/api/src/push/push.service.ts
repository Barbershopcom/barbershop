import { Injectable, Logger } from '@nestjs/common';

/**
 * Cliente do Expo Push Service. ADR-010 §5.
 *
 * Envia notificações push via API HTTP do Expo (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Não exige API key. Tokens são formato `ExponentPushToken[xxx]`.
 *
 * Service NUNCA throws — push é best-effort (igual EmailService).
 * Reminder worker já dispara email; push é complemento.
 */
@Injectable()
export class PushService {
  private static readonly logger = new Logger(PushService.name);
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  async send(args: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<{ ok: boolean; sent: number; error?: string }> {
    const validTokens = args.tokens.filter((t) => t.startsWith('ExponentPushToken['));
    if (validTokens.length === 0) {
      return { ok: true, sent: 0 };
    }

    const messages = validTokens.map((to) => ({
      to,
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    try {
      const res = await fetch(PushService.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        const text = await res.text();
        PushService.logger.warn(`Expo Push HTTP ${res.status}: ${text}`);
        return { ok: false, sent: 0, error: `HTTP ${res.status}` };
      }
      const parsed = (await res.json()) as { data?: Array<{ status: string; message?: string }> };
      const errors = parsed.data?.filter((r) => r.status === 'error') ?? [];
      if (errors.length > 0) {
        PushService.logger.warn(
          `Expo Push rejeitou ${errors.length}/${messages.length}: ${JSON.stringify(errors.slice(0, 3))}`,
        );
      }
      const sent = messages.length - errors.length;
      PushService.logger.log(`Expo Push: enviadas ${sent}/${messages.length}`);
      return { ok: errors.length === 0, sent };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      PushService.logger.warn(`Expo Push falhou: ${msg}`);
      return { ok: false, sent: 0, error: msg };
    }
  }
}
