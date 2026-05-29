import { z } from 'zod';

const DEV_CANCEL_SECRET = 'dev-only-cancel-secret-CHANGE-IN-PROD-please';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),

    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),

    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_JWKS_URL: z.string().url().optional(),
    SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
    SUPABASE_JWT_ISSUER: z.string().url().optional(),

    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

    // Email (Sprint 5). Sem RESEND_API_KEY o EmailService loga warning e
    // funciona como no-op — booking continua mesmo sem email configurado.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().default('onboarding@resend.dev'),
    /** URL pública usada nos magic links do email (sem trailing slash). */
    PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
    /** Secret HMAC pros tokens de cancel (mínimo 32 chars em prod). */
    APPOINTMENT_CANCEL_SECRET: z
      .string()
      .min(16, 'APPOINTMENT_CANCEL_SECRET deve ter pelo menos 16 chars')
      .default(DEV_CANCEL_SECRET),

    // Observability (ADR-014). Sem DSN, Sentry vira no-op (OK em dev).
    SENTRY_DSN: z.string().url().optional(),
  })
  // Validações extras só em production — evita guard-rails atrapalhando dev.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.APPOINTMENT_CANCEL_SECRET === DEV_CANCEL_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'APPOINTMENT_CANCEL_SECRET está com valor default em production — gere um secret de 32+ bytes.',
        path: ['APPOINTMENT_CANCEL_SECRET'],
      });
    }
    if (env.PUBLIC_WEB_URL.includes('localhost') || env.PUBLIC_WEB_URL.includes('127.0.0.1')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PUBLIC_WEB_URL aponta pra localhost em production.',
        path: ['PUBLIC_WEB_URL'],
      });
    }
    if (env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CORS_ORIGINS vazio em production bloqueia toda chamada browser. Configure pelo menos a URL do web app.',
        path: ['CORS_ORIGINS'],
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(input: Record<string, unknown> = process.env): Env {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed');
  }
  return parsed.data;
}
