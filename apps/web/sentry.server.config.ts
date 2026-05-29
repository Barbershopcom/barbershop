import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA
      ? `barbearia-web@${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}`
      : `barbearia-web@dev`,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
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
