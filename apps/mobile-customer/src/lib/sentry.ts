import * as Sentry from '@sentry/react-native';

/**
 * Init do Sentry no mobile-customer (ADR-014). Chamado uma vez no boot
 * do app (de `app/_layout.tsx`).
 *
 * Sem DSN configurado, é no-op — Expo Go local roda sem precisar.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      const data = event.request?.data;
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        if ('customerEmail' in d) d.customerEmail = '[REDACTED]';
        if ('customerPhone' in d) d.customerPhone = '[REDACTED]';
        if ('customerName' in d) d.customerName = '[REDACTED]';
      }
      return event;
    },
  });
}

export { Sentry };
