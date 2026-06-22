# App do cliente — single-tenant (white-label por barbearia)

- **Data:** 2026-06-22
- **Status:** Aprovado (design) — pronto pra plano de implementação
- **App afetado:** `apps/mobile-customer` (Expo). Backend e demais apps inalterados.

## 1. Contexto e objetivo

Hoje o `mobile-customer` é um **marketplace multi-barbearia**: o cliente abre o
app, busca/descobre barbearias (`(public)/index`, `(public)/busca`, `descobrir`,
`b/[slug]`), escolhe uma, e só então agenda. O slug do tenant é definido pela
escolha do usuário (`booking-context.setBarbershop`).

Queremos inverter para **white-label single-tenant**: cada barbearia distribui
o **seu próprio app** (build dedicado). O cliente baixa o app da barbearia X,
abre e já está no contexto da barbearia X — sem etapa de escolha. Navega por 4
abas: **Home · Busca · Agenda · Perfil**.

## 2. Decisões (travadas com o usuário)

1. **Fixação do tenant:** build-time. Slug embutido via `EXPO_PUBLIC_TENANT_SLUG`.
   1 build EAS por barbearia, com nome/ícone próprios (white-label de verdade).
2. **Auth:** guest-first. Home e o fluxo de agendar funcionam **sem login**
   (identidade capturada no checkout). Login só é exigido em **Agenda** e
   **Perfil**. Alinha com o backend atual (guest booking + account-linking via
   `CustomerService.ensureForUser`, ADR-005/010).
3. **Tabs (4):** Home (painel do cliente) · Busca (= tela de agendar) · Agenda
   (meus agendamentos) · Perfil.
4. **Home = painel do cliente:** saudação + card "próximo agendamento" +
   atalhos (Agendar/Histórico) quando logado; guest vê header da barbearia +
   CTA "Agendar" + convite a logar.

## 3. Arquitetura — `TenantProvider`

Novo contexto React (`src/lib/tenant-context.tsx`) montado na raiz, acima do
`BookingProvider`:

- No boot, lê `EXPO_PUBLIC_TENANT_SLUG` e faz `GET /public/tenants/:slug`
  (+ `/:slug/services` quando útil) → expõe
  `{ slug, barbershopId, name, ratingAvg, address?, services? }` e estados
  `loading | ready | error`.
- Substitui a escolha manual de barbearia. O `BookingProvider` passa a ser
  **inicializado a partir do TenantProvider** (não mais de `setBarbershop` por
  tela de marketplace). `setBarbershop` deixa de ser chamado pela UI de
  descoberta (que será removida); o tenant vem do provider.
- **Falha de resolução** (env ausente, slug inexistente/privado, rede): estado
  `error` → tela única "Barbearia indisponível" com retry. Sem env =
  configuração de build inválida (mensagem clara pra quem montou o build).

**Interface (o que faz / como usar / do que depende):**
- *Faz:* resolve e mantém o tenant atual do app.
- *Usa:* `useTenant()` → `{ status, tenant, retry }`.
- *Depende de:* `EXPO_PUBLIC_TENANT_SLUG`, `@/lib/api`, `GET /public/tenants/:slug`.

## 4. Navegação

Raiz (`app/_layout.tsx`) após onboarding/splash → **`(main)` Tabs** com 4 ícones:

| Aba | Rota | Requer login? |
|-----|------|---------------|
| Home | `(main)/index` | não (guest vê CTA) |
| Busca | `(main)/busca` | não (booking guest) |
| Agenda | `(main)/agenda` | **sim** → senão prompt de login |
| Perfil | `(main)/perfil` | **sim** → já existe (reexporta `(app)/perfil`) |

- Sai o passo de escolher barbearia. `(auth)/login` é acessado sob demanda
  (tocar Agenda/Perfil como guest, ou CTA "Entrar" na Home).
- `(app)` stack (auth-gated) mantém `editar-perfil`, `notificacoes`, `promocoes`.
- O fluxo de booking (`(public)/agendamento/[slug]/*`) **permanece** como stack,
  mas alimentado pelo slug do `TenantProvider` (a aba Busca navega para o slug
  do env em vez de um slug escolhido).

## 5. Telas

**Home (`(main)/index`) — painel do cliente**
- Header: nome/logo da barbearia (do `TenantProvider`).
- Logado: "Olá, {nome}" + card **próximo agendamento** (de
  `GET /me/customer-appointments`, o futuro mais próximo) + atalhos
  Agendar (→ Busca) e Histórico (→ Agenda).
- Guest: CTA grande **Agendar** (→ Busca) + "Entrar para ver seus agendamentos"
  (→ login). Sem dados pessoais.
- Estados: loading/erro herdam do `TenantProvider`; bloco de agendamentos tem
  seu próprio loading/empty.

**Busca (`(main)/busca`) — agendar**
- Ponto de entrada do fluxo de agendamento, já no tenant do env: serviço →
  barbeiro → data/hora → checkout (dados) → pagamento/pix → sucesso.
- Reusa o stack existente em `agendamento/[slug]` passando o slug do env.

**Agenda (`(main)/agenda`) — meus agendamentos**
- Requer login (senão prompt). Lista via `GET /me/customer-appointments`;
  cancelar via `POST /me/customer-appointments/:id/cancel` (já existe).

**Perfil (`(main)/perfil`)**
- Já entregue (commit `020e14b`); requer login. Sem mudança funcional.

## 6. Remoções (single-tenant não precisa)

- `app/(public)/index.tsx`, `app/(public)/home.tsx`, `app/(public)/busca.tsx`
  (descoberta/marketplace).
- `app/descobrir` se existir no mobile; `app/(public)/b/[slug]` (landing de
  marketplace).
- Manter `app/(public)/agendamento/[slug]/*` (booking) — só muda a origem do slug.
- Remoção valida que nada do que fica referencia as telas removidas (ajustar
  imports/navegação órfã).

## 7. Build (DevOps — fase posterior, não bloqueia dev)

- EAS: variável `EXPO_PUBLIC_TENANT_SLUG` por barbearia (profile/secret por
  cliente) + `app.config` com nome/ícone por tenant.
- Dev/local: usar um slug de teste apontando pra uma barbearia do Postgres local.
- Detalhamento (perfis EAS, automação de build por cliente) fica no plano; não é
  pré-requisito pra implementar/validar o fluxo localmente.

## 8. Testes

- `TenantProvider`: resolve OK (mock fetch) e slug inválido → estado `error`.
- Gate guest: Agenda e Perfil sem login → prompt; com login → conteúdo.
- Home: render guest (CTA) vs logado (saudação + próximo agendamento).
- Booking: continua funcionando com o slug vindo do env (smoke).
- Backend: sem mudança → suíte atual (77/77) permanece verde.

## 9. Endpoints referenciados (existentes, verificados)

- `GET /public/tenants/:slug` → `PublicTenantDto` (slug, name, address, ratingAvg…).
- `GET /public/tenants/:slug/services` → catálogo (name, price, duration).
- `GET /me/customer-appointments` → agendamentos do cliente logado.
- `POST /me/customer-appointments/:id/cancel` → cancelar.
- `GET /me/customer` / `PATCH /me/customer` → perfil (já consumido).

## 10. Fora de escopo

- Prefill do checkout a partir do perfil (vai na sprint de pagamento).
- Push, upload de avatar, multi-unidade.
- Automação completa de build por cliente no CI (fica pro plano de DevOps).

## 11. Riscos

- **Operacional de build por cliente** (a decisão escolhida): 1 EAS build +
  listagem na loja por barbearia. Aceito para o modelo white-label; mitigar com
  automação de build no futuro.
- **Código órfão na remoção**: garantir que nenhuma rota/import aponte pras telas
  de marketplace removidas (typecheck + lint pegam a maioria).
- **`booking-context` acoplado à escolha do usuário**: refac para inicializar do
  `TenantProvider` sem quebrar o fluxo de pagamento já existente.
