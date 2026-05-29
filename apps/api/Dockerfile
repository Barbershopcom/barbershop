# syntax=docker/dockerfile:1.7
# Multi-stage build para apps/api (NestJS) no monorepo pnpm/turborepo.
# Build no Railway: contexto = root do monorepo; Dockerfile path = apps/api/Dockerfile.

ARG NODE_VERSION=20-slim

# ---------- Stage 1: builder ----------
FROM node:${NODE_VERSION} AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /repo

# Manifests primeiro (cache layer estável quando só código muda)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter=@barbearia/api... --filter=@barbearia/schemas...

# Código
COPY packages/schemas ./packages/schemas
COPY packages/tsconfig ./packages/tsconfig
COPY apps/api ./apps/api

# Build schemas (dep transitiva) + Prisma generate + build api
RUN pnpm --filter=@barbearia/schemas build && \
    pnpm --filter=@barbearia/api prisma:generate && \
    pnpm --filter=@barbearia/api build

# Cria deploy package standalone (resolve symlinks + prod-only deps).
# `--legacy` necessário desde pnpm v10 (ADR-013): nova flag espera
# workspace com `inject-workspace-packages=true` no .npmrc; mantemos
# resolução por symlinks legacy pra evitar refactor.
RUN pnpm --filter=@barbearia/api deploy --prod --legacy /deploy

# `pnpm deploy --legacy` não preserva os arquivos gerados pelo Prisma
# (`.prisma/client/*` ficam no node_modules do builder mas não são
# copiados pro /deploy). Re-roda generate apontando pra /deploy.
#
# pnpm com workspaces hospeda o binário em /repo/apps/api/node_modules/.bin
# (não em /repo/node_modules/.bin). Usa find pra robustez entre versões.
RUN PRISMA_BIN=$(find /repo -name "prisma" -path "*/.bin/*" -type f 2>/dev/null | head -1) && \
    if [ -z "$PRISMA_BIN" ]; then echo "ERROR: prisma binary not found"; exit 1; fi && \
    echo "Using prisma binary: $PRISMA_BIN" && \
    cd /deploy && $PRISMA_BIN generate --schema=./prisma/schema.prisma

# ---------- Stage 2: runtime ----------
FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Usuário não-root pra rodar a app
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /deploy/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /deploy/package.json ./
COPY --from=builder --chown=nestjs:nodejs /deploy/prisma ./prisma

USER nestjs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3333)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# dumb-init repassa sinais corretamente (importante pra graceful shutdown
# do pg-boss + Prisma)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
