#!/usr/bin/env node
/**
 * Carrega .env.test e executa o comando passado, pra apontar a CLI do Prisma
 * pro Postgres de teste sem tocar no .env de produção.
 *
 *   node scripts/with-test-env.mjs prisma migrate deploy
 *
 * Invocado via npm script, então node_modules/.bin já está no PATH.
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.test') });

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('uso: node scripts/with-test-env.mjs <comando> [args...]');
  process.exit(1);
}

const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env: process.env });
process.exit(res.status ?? 1);
