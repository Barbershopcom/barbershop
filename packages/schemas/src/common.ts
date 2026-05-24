import { z } from 'zod';

/** UUID v4/v7 (Postgres uuid). */
export const uuidSchema = z.string().uuid();

/** Telefone E.164 (ex: +5511999999999). */
export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Telefone deve estar no formato E.164 (ex: +5511999999999)');

/** Email RFC 5322 (loose). */
export const emailSchema = z.string().email();

/** Slug humano-legível (ex: 'barbearia-do-ze'). */
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, 'Slug inválido');

/** ISO 8601 timezone (ex: 'America/Sao_Paulo'). */
export const timezoneSchema = z.string().min(1);
