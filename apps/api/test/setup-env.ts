import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Carrega env antes dos testes (Prisma client lê DATABASE_URL).
//
// .env.test tem PRIORIDADE: aponta pro Postgres efêmero de teste, garantindo
// que a suíte nunca bata no banco de produção. dotenv não sobrescreve vars já
// definidas, então carregar .env.test primeiro faz suas vars vencerem; o .env
// entra só como fallback pros demais valores.
const apiDir = resolve(__dirname, '..');
const testEnv = resolve(apiDir, '.env.test');
if (existsSync(testEnv)) {
  config({ path: testEnv });
}
config({ path: resolve(apiDir, '.env') });
