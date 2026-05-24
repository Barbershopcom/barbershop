# Multi-stage build para apps/api (NestJS) no monorepo pnpm/turborepo.
# Build no Railway: usar root do monorepo como contexto e este Dockerfile.

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /repo

# Copia manifests pra cache de install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter=@barbearia/api...

# Copia o resto da fonte
COPY packages ./packages
COPY apps/api ./apps/api

# Gera Prisma Client + build
RUN pnpm --filter=@barbearia/api prisma:generate
RUN pnpm --filter=@barbearia/api build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copia node_modules e dist do builder
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/api/node_modules ./apps/api/node_modules

EXPOSE 3333

CMD ["node", "dist/main.js"]
