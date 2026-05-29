import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'barbearia-web@dev',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session Replay desabilitado (ADR-014 §7) — LGPD + quota.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Scrub PII em body de fetch errors
      const data = event.request?.data;
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        if ('customerEmail' in d) d.customerEmail = '[REDACTED]';
        if ('customerPhone' in d) d.customerPhone = '[REDACTED]';
        if ('customerName' in d) d.customerName = '[REDACTED]';
        if ('password' in d) d.password = '[REDACTED]';
      }
      return event;
    },
  });
}
