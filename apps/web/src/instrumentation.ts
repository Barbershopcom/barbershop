/**
 * Next.js instrumentation hook (ADR-014). Roda no boot do servidor
 * (Node runtime + Edge runtime).
 *
 * Refer: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// React Server Components error handler (Next.js 15+).
// Sentry expoõe como `captureRequestError`; Next espera nome `onRequestError`.
export const onRequestError = Sentry.captureRequestError;
