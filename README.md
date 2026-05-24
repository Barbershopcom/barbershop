# Barbearia v2

SaaS B2B2C de gestão de barbearias. Stack vigente: ver [docs/adr/0002-revisao-stack-backend-auth.md](docs/adr/0002-revisao-stack-backend-auth.md).

> Setup completo e instruções de contas externas ficam na seção **Setup** ao final da Phase F.

## Estrutura

```
apps/
  api/                NestJS + Prisma + Supabase Auth (Railway)
  web/                Next.js 15 + Tailwind + shadcn (Vercel)
  mobile-business/    Expo + NativeWind (admin + barbeiro)
  mobile-customer/    Expo + NativeWind (cliente final)
packages/
  tsconfig/           configs base de TS
  eslint-config/      configs compartilhadas de ESLint
  schemas/            Zod schemas
  api-client/         tipos TS gerados via OpenAPI
  domain/             regras de negócio puras
docs/adr/             Architecture Decision Records
```

## Requisitos

- Node 20+
- pnpm 10+
- Contas externas: GitHub, Neon, Supabase, Railway, Vercel, Expo

## Scripts

- `pnpm dev` — sobe API + web + mobile (via Turborepo)
- `pnpm build` — build de tudo
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck
- `pnpm test` — testes
- `pnpm format` — prettier
