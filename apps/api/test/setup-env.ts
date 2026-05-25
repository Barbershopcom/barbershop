import { config } from 'dotenv';
import { resolve } from 'node:path';

// Carrega .env do apps/api antes dos testes rodarem (Prisma client lê DATABASE_URL).
config({ path: resolve(__dirname, '..', '.env') });
