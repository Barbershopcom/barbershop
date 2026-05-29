/**
 * Sentry init — ADR-014. Importar PRIMEIRO no main.ts (antes de qualquer
 * outro código que possa lançar). Sem DSN setado, é no-op (dev local OK).
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV ?? 'development';
const release = process.env.RAILWAY_GIT_COMMIT_SHA
  ? `barbearia-api@${process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7)}`
  : `barbearia-api@dev`;

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    release,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Scrub PII — campos sensíveis do domínio que Sentry default não pega.
      const req = event.request;
      if (req?.data && typeof req.data === 'object') {
        const data = req.data as Record<string, unknown>;
        if ('customerEmail' in data) data.customerEmail = '[REDACTED]';
        if ('customerPhone' in data) data.customerPhone = '[REDACTED]';
        if ('customerName' in data) data.customerName = '[REDACTED]';
        if ('password' in data) data.password = '[REDACTED]';
      }
      if (req?.headers) {
        const headers = req.headers as Record<string, string>;
        if (headers.authorization) headers.authorization = '[REDACTED]';
        if (headers.cookie) headers.cookie = '[REDACTED]';
      }
      return event;
    },
    ignoreErrors: [
      // Erros 4xx esperados, não são bugs
      'BadRequestException',
      'UnauthorizedException',
      'ForbiddenException',
      'NotFoundException',
      'ThrottlerException',
    ],
  });
}

export { Sentry };
