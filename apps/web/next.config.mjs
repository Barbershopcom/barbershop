import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Diretório da instrumentation hook (ADR-014).
  // Sem isso, sentry.server.config.ts não roda no boot.
};

const sentryOptions = {
  // Silencioso em CI/build local quando SENTRY_AUTH_TOKEN não setado.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Org + project do Sentry (setados em prod via env Vercel).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Source maps só quando token presente — evita upload em build local.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  disableLogger: true,
  automaticVercelMonitors: false,
};

export default withSentryConfig(nextConfig, sentryOptions);
