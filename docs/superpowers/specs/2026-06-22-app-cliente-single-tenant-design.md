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

1. **Fixação do tenant:** app único + deep link. O dono compartilha um link/QR
   com o slug (`.../b/{slug}`); na 1ª abertura o app **persiste o slug**
   (AsyncStorage) e fica fixo nele. **1 build EAS / 1 listagem na loja** para
   todas as barbearias. (Build nativo white-label por barbearia fica como
   upgrade futuro, fora deste escopo.)
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

- **Resolução do slug**, nesta ordem: (1) parâmetro de **deep link** `/b/:slug`
  na abertura (e **persiste** em AsyncStorage); (2) slug **persistido** de uma
  abertura anterior. Com o slug, faz `GET /public/tenants/:slug`
  (+ `/:slug/services` quando útil) → expõe
  `{ slug, barbershopId, name, ratingAvg, address?, services? }` e estados
  `loading | ready | error | no-tenant`.
- Substitui a escolha manual de barbearia. O `BookingProvider` passa a ser
  **inicializado a partir do TenantProvider** (não mais de `setBarbershop` por
  tela de marketplace). `setBarbershop` deixa de ser chamado pela UI de
  descoberta (que será removida); o tenant vem do provider.
- **`no-tenant`** (app aberto sem deep link e nada persistido): tela "Abra pelo
  link da sua barbearia" (o app é link-first). **Trocar de barbearia** = abrir
  outro link `/b/:slug` (sobrescreve o slug persistido).
- **`error`** (slug inexistente/privado/rede): tela "Barbearia indisponível"
  com retry.

**Interface (o que faz / como usar / do que depende):**
- *Faz:* resolve e mantém o tenant atual do app.
- *Usa:* `useTenant()` → `{ status, tenant, retry }`.
- *Depende de:* deep link `/b/:slug` + AsyncStorage, `@/lib/api`, `GET /public/tenants/:slug`.

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
  resolvido, em vez de um slug escolhido pelo usuário).

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
- Ponto de entrada do fluxo de agendamento, já no tenant resolvido pelo
  `TenantProvider`: serviço → barbeiro → data/hora → checkout (dados) →
  pagamento/pix → sucesso.
- Reusa o stack existente em `agendamento/[slug]` passando o slug do `TenantProvider`.

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

## 7. Distribuição e fluxo do dono

**1 build / 1 app na loja** serve todas as barbearias. O tenant é fixado por
**deep link**, não por build.

**Fluxo do dono (como sai o app):**
1. Dono faz onboarding no **web** e cria a barbearia (gera o `slug`).
2. Web **mostra o link/QR** da barbearia (`.../b/{slug}`) pra ele compartilhar.
3. Cliente abre o link/escaneia o QR → instala o app único → o app **fixa** a
   barbearia naquela abertura e persiste o slug.

**Pontos técnicos:**
- **Deep link:** universal/app link `/b/:slug` (mesmo padrão de slug do web).
- **Web gera o link/QR:** pequeno acréscimo no `apps/web` (painel do dono mostra
  o link; QR é nice-to-have). Pode entrar nesta sprint ou logo depois.
- **Deferred deep link:** instalar a partir do link **não** repassa o slug
  automaticamente após o install (limitação de loja). MVP: o cliente **reabre o
  link / escaneia o QR após instalar** e o app fixa a barbearia nessa abertura.
  Solução plena (Branch/AppsFlyer) fica fora do MVP.
- **Dev/local:** abrir o app com o slug via deep link de teste (ou seed no
  AsyncStorage) apontando pra uma barbearia do Postgres local.
- **App do barbeiro:** inalterado — 1 app, multi-tenant por login (`/me/employee`).
  Dono convida funcionário no web; barbeiro baixa o app único e loga.

## 8. Testes

- `TenantProvider`: resolve OK (mock fetch) e slug inválido → estado `error`.
- Gate guest: Agenda e Perfil sem login → prompt; com login → conteúdo.
- Home: render guest (CTA) vs logado (saudação + próximo agendamento).
- Booking: continua funcionando com o slug vindo do `TenantProvider` (smoke).
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

- **Deferred deep link** (cold start sem slug): instalar via link não repassa o
  slug após o install. Mitigado pela tela `no-tenant` ("abra pelo link") +
  reabrir o link/QR; solução plena (Branch) fora do MVP.
- **Código órfão na remoção**: garantir que nenhuma rota/import aponte pras telas
  de marketplace removidas (typecheck + lint pegam a maioria).
- **`booking-context` acoplado à escolha do usuário**: refac para inicializar do
  `TenantProvider` sem quebrar o fluxo de pagamento já existente.
