# ADR-010: Sprint 9 — Mobile customer (Expo)

- **Data:** 2026-05-28
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-009; complementa ADR-003)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 8 entregou a web pública `/b/<slug>` — barbearia tem um link
divulgável. O `mobile-customer` está só com esqueleto (`_layout`,
`index`, `login`) desde a fundação do projeto. Web cobre o caso de uso
"reservar uma vez", mas falta o canal **retento** — cliente que cliente
fideliza, recebe push, vê histórico, reagenda rápido.

Sprint 9 transforma o esqueleto num app funcional. Mobile-business
(Sprint 2) já deu o padrão Expo Router + NativeWind + Supabase Auth +
API client com 401 handler — reusamos onde aplicável, mas o caso de uso
muda significativamente (cliente final ≠ barbeiro logado todo dia).

---

## Decisões

### 1. **Guest-first** — login opcional, não obrigatório

Cliente baixa o app pra reservar **uma vez**. Forçar signup mata
conversão. Login Supabase fica como tela opcional que **desbloqueia
features**:

- Histórico (`/me/appointments` agregando N barbearias)
- Cancel direto no app (sem precisar do magic link no email)
- Push reminder (precisa de user vinculado pra `expo_push_token`)

Booking guest funciona sem auth — usa endpoint público
`POST /public/tenants/:slug/appointments` (já existe desde Sprint 4).

### 2. **Discovery via deeplink + slug search**

Barbearia divulga `barbearia://b/<slug>` no WhatsApp/Instagram ou QR
code físico no balcão. Cliente abre direto na landing daquele tenant.

Fallback: tela inicial tem **search por slug** ("digite o nome da
barbearia"). Sem marketplace — nem geo, nem lista, nem rating. Tudo
isso é Sprint 12+.

`expo-linking` configurado com scheme `barbearia` no `app.json`.
Universal links (Apple/Google JSON) ficam pra Sprint 10+ junto com EAS
build.

### 3. **Stack navigation** — sem tabs principais

Cliente típico: descobre → reserva → confirma → sai (até voltar pra
cancelar/repetir). Não tem "operação contínua" como o barbeiro tem na
agenda.

- `(public)` group: index (search), `b/[slug]/index`, `b/[slug]/agendar`, `b/[slug]/sucesso`
- `(auth)` group: `login`
- `(app)` group (só logado): `meus-agendamentos`, `perfil`

Tabs só aparecem dentro de `(app)`. Cliente guest nunca vê tabs.

### 4. **react-native-calendars** + chips de horário

`react-native-calendars` (Wix, MIT, ~80KB) é o padrão React Native pra
date picker. Suporte pt-BR nativo, marca dias disponíveis, tema custom.

Chips de horário abaixo do calendar (mesmo pattern da web pública —
botões agrupados visualmente por barbeiro quando filtro = todos).

Não usar FullCalendar (web only) nem date picker do iOS nativo
(insuficiente pra slot grid).

### 5. **Push notifications via Expo Push Service**

Expo Push é gratuito, transparente sobre APNs/FCM, e dispensa setup de
Firebase/Apple Push Certificates pra dev.

Flow:
1. Cliente abre app → `expo-notifications` pede permissão (iOS) + pega `ExponentPushToken[xxx]`
2. Cliente reserva → POST manda `expoPushToken` no body (opcional)
3. API guarda token na tabela `customer_devices` (nova) vinculado ao `customerPhone` (proxy de identidade até ter login)
4. Reminder worker (Sprint 6) busca tokens do customer + dispara push via Expo API antes de enviar email

Push **complementa** email — não substitui. Cliente sem app não recebe
push, mas todo cliente com email recebe email (campos opcionais
preservados).

Sem persistência de "lida"/"recebida" nessa sprint — Sprint 10+.

### 6. **Sem EAS build nesse sprint**

Dev rola via Expo Go (mesma estratégia do mobile-business). EAS build
+ submission TestFlight/Internal Track vira **Sprint 10**.

Implica: durante Sprint 9 ninguém instala o app pelo App Store —
testamos via Expo Go (escanear QR code do `expo start`). Suficiente
pra validar UX e desbloquear o resto da implementação.

### 7. Reuso de lógica via cópia (não package compartilhado)

Helpers como `toE164`, `formatPriceBRL`, `formatSlot` aparecem na web
pública (Sprint 8). Vou **copiar** pro mobile-customer ao invés de
refatorar pra `@barbearia/utils` agora.

Razão: refactor prematuro custa caro (build pipeline, test pipeline,
TS path config). Quando a 3a duplicação aparecer (em outro app), faço
o move. Por ora, ~30 linhas duplicadas é barato.

### 8. **API: 1 mudança pequena** — `customer_devices` table

Novo model Prisma:

```prisma
model CustomerDevice {
  id             String   @id @default(uuid()) @db.Uuid
  expoPushToken  String   @unique @map("expo_push_token")
  customerPhone  String   @map("customer_phone")
  lastSeenAt     DateTime @default(now()) @map("last_seen_at") @db.Timestamptz(6)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([customerPhone])
  @@map("customer_devices")
}
```

Sem RLS — devices não são tenant-scoped (cliente reserva em N
barbearias com o mesmo telefone). Bypassada pelo bypassRLS role.

Booking endpoint ganha campo opcional `expoPushToken` no body. Se
presente, upserta `customer_devices` com `customerPhone`.

Reminder worker (Sprint 6) faz `findMany({ customerPhone })` antes de
enviar email pra disparar push pra todos os devices conhecidos.

### 9. Errors → toasts/alerts nativos

Sem libraries (sonner-native, react-native-toast, etc). Pra MVP usa
`Alert.alert` do RN. Migra pra biblioteca quando o produto tiver
volume de erros que justifique UX melhor.

### 10. **Sem state management global**

Mobile-business roda com hooks locais + session.tsx provider. Mobile-
customer segue padrão: session opcional (porque guest-first), navegação
controla state. Zustand/Jotai/Redux só entram se aparecer real shared
state (carrinho, lista compartilhada).

---

## Trade-offs aceitos

- **Sem marketplace** — cliente precisa do link da barbearia. OK pra
  MVP. Marketplace é projeto inteiro (geo, search, ranking, payments
  per acquisition).
- **Sem fidelidade/pontos** — futuro, quando tiver tração.
- **Sem favoritos** — Sprint 10+ quando login virar mais comum.
- **Sem multi-loja** — uma barbearia = um slug. Redes ficam pra
  Sprint 11+.
- **Sem PWA install prompt na web pública** — usuários que querem app
  instalam o app real, não PWA.
- **Push sem deduplicação rigorosa** — se cliente tem 2 devices (cel +
  tablet), recebe push em ambos. UX OK.

---

## Roadmap em fases

| Fase | Entrega                                                                       |
|------|-------------------------------------------------------------------------------|
| 1    | ADR-010 + estrutura `(public)`/`(auth)`/`(app)` + api client + navigation     |
| 2    | Search inicial + landing `/b/[slug]` (catálogo de serviços)                   |
| 3    | Slot picker (react-native-calendars) + chips de horário                       |
| 4    | Form cliente + POST booking + tela sucesso (com Idempotency-Key)              |
| 5    | Histórico (logado) via `/me/appointments` + cancel in-app                     |
| 6    | Push notifications (Expo Push) + reminder dual no worker                      |

Commit ao final de cada fase. Smoke ponta-a-ponta após Phase 6.
