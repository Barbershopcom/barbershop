# App cliente single-tenant (white-label via deep link) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o `mobile-customer` de marketplace multi-barbearia em app single-tenant white-label, com a barbearia fixada por deep link e navegação em 4 abas (Home · Busca · Agenda · Perfil).

**Architecture:** Um `TenantProvider` resolve o slug (deep link `/b/:slug` → persistido em AsyncStorage), busca `GET /public/tenants/:slug` e expõe o tenant pro app inteiro. O `BookingProvider` é inicializado a partir dele. Guest-first: Home/Busca sem login; Agenda/Perfil pedem login. Telas de descoberta são removidas.

**Tech Stack:** Expo + Expo Router (file-based), React Native, `@/lib/api` (fetch + Supabase auth), `@/lib/use-query`, `@/lib/session`, `@barbearia/schemas`, AsyncStorage. Testes: jest-expo + @testing-library/react-native (a configurar).

## Global Constraints

- Guest-first: nunca redirecionar guest pro login no nível raiz; só Agenda/Perfil exigem login (ADR-005/010).
- Slug do tenant vem SEMPRE do `TenantProvider` (deep link `/b/:slug` + AsyncStorage), nunca de escolha do usuário nem de env de build.
- Reusar padrões existentes: `@/lib/api`, `@/lib/use-query`, `@/lib/session`, `@/lib/format`. Não introduzir libs novas além do harness de teste.
- Backend e schemas inalterados. Endpoints usados: `GET /public/tenants/:slug`, `GET /public/tenants/:slug/services`, `GET /me/customer-appointments`, `GET /me/customer`.
- Commits frequentes, um por task. Sem push automático.
- `pnpm --filter @barbearia/mobile-customer typecheck` e `lint` devem ficar verdes ao fim de cada task.

---

## File Structure

- `src/lib/tenant-slug.ts` (criar) — lógica pura de resolução/persistência do slug (testável sem RN).
- `src/lib/tenant-context.tsx` (criar) — `TenantProvider` + `useTenant()`.
- `app/_layout.tsx` (modificar) — montar `TenantProvider`; corrigir gate guest; rotear estados do tenant.
- `src/lib/booking-context.tsx` (modificar) — inicializar a partir do `useTenant()`.
- `app/(main)/index.tsx` (reescrever) — Home painel do cliente.
- `app/(main)/busca.tsx` (reescrever) — entrada do agendamento (serviços do tenant).
- `app/(main)/agenda.tsx` (modificar) — gate guest sobre `meus-agendamentos`.
- `app/(public)/agendamento/[slug]/*` (manter) — fluxo de booking, alimentado pelo slug resolvido.
- Remover: `app/(public)/index.tsx`, `app/(public)/home.tsx`, `app/(public)/busca.tsx`, `app/(public)/b/[slug]/` (landing de marketplace), `app/descobrir` (se existir).
- `jest.config.js`, `jest-setup.ts`, `package.json` (test) (criar/modificar) — harness.
- `apps/web` painel do dono (modificar) — exibir link/QR `/b/{slug}`.

---

## Task 1: Harness de teste (jest-expo)

**Files:**
- Modify: `apps/mobile-customer/package.json` (script `test` + devDeps)
- Create: `apps/mobile-customer/jest.config.js`
- Create: `apps/mobile-customer/jest-setup.ts`
- Test: `apps/mobile-customer/src/lib/smoke.test.ts`

**Interfaces:**
- Produces: harness `pnpm --filter @barbearia/mobile-customer test` rodando jest com preset `jest-expo`.

- [ ] **Step 1: Instalar devDeps**

Run:
```bash
cd apps/mobile-customer && pnpm add -D jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 2: Criar `jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@barbearia/.*))',
  ],
};
```

- [ ] **Step 3: Criar `jest-setup.ts`**

```ts
// Mock do AsyncStorage pra testes de unidade.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- [ ] **Step 4: Trocar o script `test`**

Em `package.json`, trocar `"test": "echo \"no tests yet\" && exit 0"` por:
```json
"test": "jest"
```

- [ ] **Step 5: Smoke test**

`src/lib/smoke.test.ts`:
```ts
describe('harness', () => {
  it('roda', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Rodar**

Run: `pnpm --filter @barbearia/mobile-customer test`
Expected: PASS (1 teste).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile-customer/package.json apps/mobile-customer/jest.config.js apps/mobile-customer/jest-setup.ts apps/mobile-customer/src/lib/smoke.test.ts pnpm-lock.yaml
git commit -m "test(mobile-customer): adicionar harness jest-expo"
```

---

## Task 2: Lógica de slug (pura, testável)

**Files:**
- Create: `apps/mobile-customer/src/lib/tenant-slug.ts`
- Test: `apps/mobile-customer/src/lib/tenant-slug.test.ts`

**Interfaces:**
- Produces:
  - `extractSlugFromPath(path: string | null): string | null` — extrai `slug` de um path `/b/:slug` (ou `barbeariacustomer://b/:slug`).
  - `persistSlug(slug: string): Promise<void>`
  - `loadPersistedSlug(): Promise<string | null>`
  - `STORAGE_KEY = 'tenant_slug'`

- [ ] **Step 1: Escrever os testes (falham)**

`src/lib/tenant-slug.test.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  extractSlugFromPath,
  loadPersistedSlug,
  persistSlug,
  STORAGE_KEY,
} from './tenant-slug';

describe('extractSlugFromPath', () => {
  it('extrai slug de /b/:slug', () => {
    expect(extractSlugFromPath('/b/zezinho')).toBe('zezinho');
  });
  it('extrai slug de deep link com scheme', () => {
    expect(extractSlugFromPath('barbeariacustomer://b/zezinho')).toBe('zezinho');
  });
  it('ignora query string', () => {
    expect(extractSlugFromPath('/b/zezinho?utm=x')).toBe('zezinho');
  });
  it('retorna null sem match', () => {
    expect(extractSlugFromPath('/perfil')).toBeNull();
    expect(extractSlugFromPath(null)).toBeNull();
  });
});

describe('persistência', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  it('persiste e lê o slug', async () => {
    await persistSlug('zezinho');
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('zezinho');
    expect(await loadPersistedSlug()).toBe('zezinho');
  });
  it('loadPersistedSlug retorna null se nada salvo', async () => {
    expect(await loadPersistedSlug()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar (falha)**

Run: `pnpm --filter @barbearia/mobile-customer test tenant-slug`
Expected: FAIL ("Cannot find module './tenant-slug'").

- [ ] **Step 3: Implementar**

`src/lib/tenant-slug.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'tenant_slug';

/** Extrai o slug de um path/URL `/b/:slug` (com ou sem scheme/query). */
export function extractSlugFromPath(path: string | null): string | null {
  if (!path) return null;
  const match = path.match(/\/b\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function persistSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, slug);
}

export async function loadPersistedSlug(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Rodar (passa)**

Run: `pnpm --filter @barbearia/mobile-customer test tenant-slug`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-customer/src/lib/tenant-slug.ts apps/mobile-customer/src/lib/tenant-slug.test.ts
git commit -m "feat(mobile-customer): lógica de resolução/persistência do slug do tenant"
```

---

## Task 3: TenantProvider

**Files:**
- Create: `apps/mobile-customer/src/lib/tenant-context.tsx`
- Test: `apps/mobile-customer/src/lib/tenant-context.test.tsx`

**Interfaces:**
- Consumes: `extractSlugFromPath`, `persistSlug`, `loadPersistedSlug` (Task 2); `api.get` (`@/lib/api`); `useURL` de `expo-linking`.
- Produces:
  - `type TenantState = { status: 'loading' } | { status: 'no-tenant' } | { status: 'error'; retry: () => void } | { status: 'ready'; tenant: Tenant }`
  - `interface Tenant { slug: string; barbershopId: string; name: string; ratingAvg: number | null }`
  - `useTenant(): TenantState`
  - `<TenantProvider>{children}</TenantProvider>`

- [ ] **Step 1: Escrever o teste (falha)**

`src/lib/tenant-context.test.tsx`:
```tsx
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import React from 'react';

import * as slug from './tenant-slug';
import { api } from './api';
import { TenantProvider, useTenant } from './tenant-context';

jest.mock('expo-linking', () => ({ useURL: () => null }));
jest.mock('./api');

function Probe() {
  const state = useTenant();
  return <Text>{state.status === 'ready' ? state.tenant.name : state.status}</Text>;
}

describe('TenantProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no-tenant quando não há deep link nem slug persistido', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue(null);
    const { getByText } = render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('no-tenant'));
  });

  it('ready quando há slug persistido e o fetch responde', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue('zezinho');
    (api.get as jest.Mock).mockResolvedValue({
      slug: 'zezinho', barbershopId: 'bs1', name: 'Barbearia Zezinho', ratingAvg: 4.5,
    });
    const { getByText } = render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('Barbearia Zezinho'));
  });

  it('error quando o fetch falha', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue('zezinho');
    (api.get as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByText } = render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('error'));
  });
});
```

- [ ] **Step 2: Rodar (falha)**

Run: `pnpm --filter @barbearia/mobile-customer test tenant-context`
Expected: FAIL ("Cannot find module './tenant-context'").

- [ ] **Step 3: Implementar**

`src/lib/tenant-context.tsx`:
```tsx
import { useURL } from 'expo-linking';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api } from './api';
import { extractSlugFromPath, loadPersistedSlug, persistSlug } from './tenant-slug';

export interface Tenant {
  slug: string;
  barbershopId: string;
  name: string;
  ratingAvg: number | null;
}

export type TenantState =
  | { status: 'loading' }
  | { status: 'no-tenant' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; tenant: Tenant };

interface PublicTenantDto {
  slug: string;
  barbershopId: string;
  name: string;
  ratingAvg: number | null;
}

const TenantContext = createContext<TenantState | null>(null);

export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant() deve ser usado dentro de <TenantProvider>');
  return ctx;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const url = useURL();
  const [state, setState] = useState<TenantState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const resolve = useCallback(async () => {
    setState({ status: 'loading' });
    const fromLink = extractSlugFromPath(url);
    if (fromLink) await persistSlug(fromLink);
    const slug = fromLink ?? (await loadPersistedSlug());
    if (!slug) {
      setState({ status: 'no-tenant' });
      return;
    }
    try {
      const dto = await api.get<PublicTenantDto>(
        `/public/tenants/${encodeURIComponent(slug)}`,
      );
      setState({
        status: 'ready',
        tenant: {
          slug: dto.slug,
          barbershopId: dto.barbershopId,
          name: dto.name,
          ratingAvg: dto.ratingAvg,
        },
      });
    } catch {
      setState({ status: 'error', retry: () => setAttempt((a) => a + 1) });
    }
  }, [url, attempt]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  return <TenantContext.Provider value={state}>{children}</TenantContext.Provider>;
}
```

> Nota: confirmar o nome real do campo de id no `PublicTenantDto` do backend (`barbershopId` vs `id`) lendo `apps/api/src/slots/public-tenants.controller.ts`; ajustar o mapeamento se necessário. Booking usa `barbershopId`.

- [ ] **Step 4: Rodar (passa)**

Run: `pnpm --filter @barbearia/mobile-customer test tenant-context`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-customer/src/lib/tenant-context.tsx apps/mobile-customer/src/lib/tenant-context.test.tsx
git commit -m "feat(mobile-customer): TenantProvider resolve barbearia via deep link"
```

---

## Task 4: Root layout — montar TenantProvider + guest-first

**Files:**
- Modify: `apps/mobile-customer/app/_layout.tsx`

**Interfaces:**
- Consumes: `TenantProvider`, `useTenant` (Task 3).

- [ ] **Step 1: Envolver com `TenantProvider`**

Em `RootLayout`, aninhar acima do `BookingProvider`:
```tsx
<SessionProvider>
  <TenantProvider>
    <BookingProvider>
      <RootLayoutNav />
    </BookingProvider>
  </TenantProvider>
</SessionProvider>
```
Importar: `import { TenantProvider, useTenant } from '@/lib/tenant-context';`

- [ ] **Step 2: Corrigir o gate (guest-first) e rotear estado do tenant**

Em `RootLayoutNav`, substituir o bloco que faz `if (state.status === 'anonymous') → (auth)` e o `if authenticated → (main)`. Novo comportamento após onboarding:
```tsx
const tenant = useTenant();

// ... (mantém loading de fontes/onboarding) ...

if (tenant.status === 'loading') {
  return <View className="flex-1 bg-background"><StatusBar style="dark" /></View>;
}
if (tenant.status === 'no-tenant') {
  return <NoTenantScreen />; // "Abra pelo link da sua barbearia"
}
if (tenant.status === 'error') {
  return <TenantErrorScreen onRetry={tenant.retry} />;
}

// tenant ready → app em abas, INDEPENDENTE de auth (guest-first)
return (
  <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(main)" />
      <Stack.Screen name="(public)/agendamento/[slug]" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  </>
);
```

- [ ] **Step 3: Telas inline de estado**

No mesmo arquivo (componentes locais simples):
```tsx
function NoTenantScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="font-display text-xl font-bold text-foreground">Abra pelo link da sua barbearia</Text>
      <Text className="text-center text-sm text-foreground-muted">
        Use o link ou QR code que a barbearia compartilhou com você.
      </Text>
    </View>
  );
}

function TenantErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="font-display text-xl font-bold text-foreground">Barbearia indisponível</Text>
      <Pressable onPress={onRetry} className="rounded-lg bg-navy px-6 py-3 active:opacity-80">
        <Text className="font-semibold text-white">Tentar de novo</Text>
      </Pressable>
    </View>
  );
}
```
Importar `Pressable`, `Text`, `View` de `react-native`.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @barbearia/mobile-customer typecheck`
Expected: exit 0.

- [ ] **Step 5: Verificação manual (smoke)**

Run: `pnpm --filter @barbearia/mobile-customer dev` e abrir com deep link `barbeariacustomer://b/<slug-de-teste>`.
Checar: sem login, cai nas abas (não na tela de login); sem slug → tela "Abra pelo link".

- [ ] **Step 6: Commit**

```bash
git add apps/mobile-customer/app/_layout.tsx
git commit -m "feat(mobile-customer): montar TenantProvider e tornar navegação guest-first"
```

---

## Task 5: BookingProvider inicializa do tenant

**Files:**
- Modify: `apps/mobile-customer/src/lib/booking-context.tsx`

**Interfaces:**
- Consumes: `useTenant` (Task 3); `setBarbershop` existente.

- [ ] **Step 1: Semear o tenant no boot do booking**

No `BookingProvider`, após `useTenant()`, sincronizar quando `ready`:
```tsx
const tenant = useTenant();
useEffect(() => {
  if (tenant.status === 'ready') {
    setBarbershop(tenant.tenant.barbershopId, tenant.tenant.name, tenant.tenant.slug);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tenant.status]);
```
> `BookingProvider` deve estar DENTRO do `TenantProvider` (garantido na Task 4).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @barbearia/mobile-customer typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile-customer/src/lib/booking-context.tsx
git commit -m "feat(mobile-customer): inicializar booking a partir do tenant resolvido"
```

---

## Task 6: Home (painel do cliente)

**Files:**
- Modify (reescrever): `apps/mobile-customer/app/(main)/index.tsx`

**Interfaces:**
- Consumes: `useTenant`, `useSession`, `useQuery`, `api`. Endpoint `GET /me/customer-appointments`.

- [ ] **Step 1: Implementar a Home**

Estrutura (guest vs logado):
```tsx
'use client';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useSession } from '@/lib/session';
import { useTenant } from '@/lib/tenant-context';
import { useQuery } from '@/lib/use-query';
import { api } from '@/lib/api';

interface AppointmentItem { id: string; startsAt: string; status: string; serviceName?: string }

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useSession();
  const tenant = useTenant();
  const isAuth = state.status === 'authenticated';
  const name = tenant.status === 'ready' ? tenant.tenant.name : '';

  const { data: appts } = useQuery<AppointmentItem[]>({
    queryFn: () => api.get<AppointmentItem[]>('/me/customer-appointments'),
    enabled: isAuth,
  });
  const next = appts?.find((a) => new Date(a.startsAt) > new Date());

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 py-8 gap-6">
      <Text className="font-display text-2xl font-bold text-foreground">{name}</Text>

      {isAuth ? (
        <>
          {next ? (
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="text-xs uppercase text-foreground-muted">Próximo agendamento</Text>
              <Text className="mt-1 font-semibold text-foreground">
                {next.serviceName ?? 'Serviço'} — {new Date(next.startsAt).toLocaleString('pt-BR')}
              </Text>
            </View>
          ) : (
            <Text className="text-foreground-muted">Você não tem agendamentos futuros.</Text>
          )}
          <View className="flex-row gap-3">
            <Pressable onPress={() => router.push('/(main)/busca')} className="flex-1 items-center rounded-lg bg-navy py-4 active:opacity-80">
              <Text className="font-semibold text-white">Agendar</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(main)/agenda')} className="flex-1 items-center rounded-lg border border-border py-4 active:bg-blue-50">
              <Text className="font-semibold text-foreground">Histórico</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable onPress={() => router.push('/(main)/busca')} className="items-center rounded-lg bg-navy py-4 active:opacity-80">
            <Text className="font-semibold text-white">Agendar agora</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text className="text-center text-navy">Entrar para ver seus agendamentos</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
```
> Confirmar a forma real de `GET /me/customer-appointments` em `apps/api/src/me/me-customer-appointments.controller.ts` e ajustar `AppointmentItem` (campos `startsAt`/`serviceName`/`status`).

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @barbearia/mobile-customer typecheck && pnpm --filter @barbearia/mobile-customer lint`
Expected: exit 0.

- [ ] **Step 3: Verificação manual (smoke)**

`dev` + deep link: guest vê "Agendar agora" + "Entrar"; logado vê próximo agendamento + atalhos.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-customer/app/(main)/index.tsx
git commit -m "feat(mobile-customer): Home painel do cliente (guest vs logado)"
```

---

## Task 7: Busca = entrada do agendamento

**Files:**
- Modify (reescrever): `apps/mobile-customer/app/(main)/busca.tsx`

**Interfaces:**
- Consumes: `useTenant`, `useRouter`. Empurra pro stack `(public)/agendamento/[slug]`.

- [ ] **Step 1: Implementar a aba Busca**

A aba mostra os serviços do tenant e inicia o fluxo. MVP: encaminha pro fluxo existente com o slug resolvido.
```tsx
'use client';
import { Redirect } from 'expo-router';
import { useTenant } from '@/lib/tenant-context';
import { View, ActivityIndicator } from 'react-native';

export default function BuscaScreen() {
  const tenant = useTenant();
  if (tenant.status !== 'ready') {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator color="#1a365d" /></View>;
  }
  return <Redirect href={`/(public)/agendamento/${encodeURIComponent(tenant.tenant.slug)}`} />;
}
```
> O stack `agendamento/[slug]/index` já faz seleção de serviço → barbeiro → data/hora → checkout. A aba Busca só injeta o slug resolvido. (Se preferir manter a tab bar visível durante o fluxo numa iteração futura, mover o fluxo pra dentro de `(main)`; fora do MVP.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @barbearia/mobile-customer typecheck`
Expected: exit 0.

- [ ] **Step 3: Verificação manual**

Tocar "Busca" → entra no fluxo de agendamento da barbearia (sem escolher barbearia).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-customer/app/(main)/busca.tsx
git commit -m "feat(mobile-customer): aba Busca inicia o agendamento no tenant resolvido"
```

---

## Task 8: Gate guest em Agenda e Perfil

**Files:**
- Modify: `apps/mobile-customer/app/(main)/agenda.tsx`
- Modify: `apps/mobile-customer/app/(main)/perfil.tsx`
- Create: `apps/mobile-customer/src/components/AuthGate.tsx`

**Interfaces:**
- Consumes: `useSession`. `agenda.tsx` e `perfil.tsx` hoje **reexportam** telas do grupo `(app)` (que tinha o gate via `(app)/_layout`). Como guest agora acessa as abas direto, o gate precisa morar na aba.
- Produces: `<AuthGate>{children}</AuthGate>` — renderiza children se autenticado, senão prompt de login.

- [ ] **Step 1: Criar o `AuthGate` (DRY — usado por Agenda e Perfil)**

`src/components/AuthGate.tsx`:
```tsx
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

export function AuthGate({ children, message }: { children: ReactNode; message: string }) {
  const { state } = useSession();
  const router = useRouter();
  if (state.status !== 'authenticated') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <Text className="text-center text-foreground-muted">{message}</Text>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="rounded-lg bg-navy px-6 py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">Entrar</Text>
        </Pressable>
      </View>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Aba Agenda com gate**

`app/(main)/agenda.tsx`:
```tsx
import { AuthGate } from '@/components/AuthGate';
import MeusAgendamentos from '../(app)/meus-agendamentos';

export default function AgendaTab() {
  return (
    <AuthGate message="Entre para ver seus agendamentos.">
      <MeusAgendamentos />
    </AuthGate>
  );
}
```

- [ ] **Step 3: Aba Perfil com gate**

`app/(main)/perfil.tsx` (hoje é `export { default } from '../(app)/perfil';`):
```tsx
import { AuthGate } from '@/components/AuthGate';
import PerfilScreen from '../(app)/perfil';

export default function PerfilTab() {
  return (
    <AuthGate message="Entre para acessar seu perfil.">
      <PerfilScreen />
    </AuthGate>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter @barbearia/mobile-customer typecheck && pnpm --filter @barbearia/mobile-customer lint`
Expected: exit 0.

- [ ] **Step 5: Verificação manual**

Guest tocando Agenda/Perfil → prompt "Entrar"; após login → conteúdo real.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile-customer/src/components/AuthGate.tsx apps/mobile-customer/app/(main)/agenda.tsx apps/mobile-customer/app/(main)/perfil.tsx
git commit -m "feat(mobile-customer): gate de login nas abas Agenda e Perfil"
```

---

## Task 9: Remover telas de marketplace

**Files:**
- Delete: `app/(public)/index.tsx`, `app/(public)/home.tsx`, `app/(public)/busca.tsx`, `app/(public)/b/[slug]/` (toda a pasta de landing), `app/descobrir/` (se existir).

- [ ] **Step 1: Mapear referências órfãs**

Run: `cd apps/mobile-customer && grep -rnE "\(public\)/(index|home|busca|b/)|descobrir" app src | grep -v node_modules`
Anotar cada referência (navegação/import) pra ajustar.

- [ ] **Step 2: Remover as telas**

```bash
cd apps/mobile-customer
git rm app/(public)/index.tsx app/(public)/home.tsx app/(public)/busca.tsx
git rm -r app/(public)/b
# se existir: git rm -r app/descobrir
```

- [ ] **Step 3: Ajustar referências órfãs**

Trocar qualquer `router.push('/(public)/b/...')` ou navegação pras telas removidas por destino válido (`/(main)` ou o fluxo de agendamento). Não deve sobrar import das telas removidas.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter @barbearia/mobile-customer typecheck && pnpm --filter @barbearia/mobile-customer lint`
Expected: exit 0 (zero referência órfã).

- [ ] **Step 5: Commit**

```bash
git add -A apps/mobile-customer
git commit -m "refactor(mobile-customer): remover telas de marketplace (single-tenant)"
```

---

## Task 10: Deep link `/b/:slug` (config + verificação)

**Files:**
- Modify: `apps/mobile-customer/app.json` (se necessário p/ universal links)
- Verify: rota `app/(public)/b/[slug]` foi removida na Task 9 — o deep link `/b/:slug` é tratado pelo `TenantProvider` via `useURL()`, não por uma tela.

- [ ] **Step 1: Garantir que o slug do link é capturado sem tela `b/[slug]`**

Como removemos `app/(public)/b/[slug]`, criar uma rota mínima que só persiste e redireciona, OU confirmar que `useURL()` no `TenantProvider` já captura o path mesmo sem rota correspondente. Implementação escolhida: criar `app/b/[slug].tsx` que persiste e redireciona pras abas:
```tsx
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { persistSlug } from '@/lib/tenant-slug';

export default function DeepLinkB() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  useEffect(() => { if (slug) void persistSlug(slug); }, [slug]);
  return <Redirect href="/(main)" />;
}
```
> Isso torna `/b/:slug` uma rota real de entrada (mais robusto que depender só de `useURL`). O `TenantProvider` lê o slug persistido no próximo ciclo.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @barbearia/mobile-customer typecheck`
Expected: exit 0.

- [ ] **Step 3: Verificação manual (deep link)**

Run: `npx uri-scheme open barbeariacustomer://b/<slug> --ios` (ou `--android`).
Checar: app abre, persiste o slug, cai nas abas no tenant certo.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-customer/app/b apps/mobile-customer/app.json
git commit -m "feat(mobile-customer): rota de deep link /b/:slug fixa a barbearia"
```

---

## Task 11: Web — painel do dono exibe link/QR

**Files:**
- Modify: `apps/web/src/app/admin/perfil/page.tsx` (ou a tela de perfil/config da barbearia)
- Possível devDep: `qrcode.react` (QR). Se evitar dep, exibir só o link copiável.

**Interfaces:**
- Consumes: slug do tenant ativo (já disponível no admin via `useActiveTenant`/perfil).

- [ ] **Step 1: Exibir o link compartilhável**

Na tela de perfil/config da barbearia, adicionar um bloco "Link do app do cliente":
```tsx
const appLink = `${process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ?? 'https://app.barbearia'}/b/${slug}`;
// render: texto do link + botão "Copiar"
```
> Confirmar de onde vem o `slug` do tenant nessa tela (provavelmente do perfil/tenant ativo). Usar `navigator.clipboard.writeText(appLink)` no botão copiar.

- [ ] **Step 2: (Opcional) QR**

Se incluir QR: `pnpm --filter @barbearia/web add qrcode.react` e renderizar `<QRCodeCanvas value={appLink} />`. Senão, deixar só o link copiável (suficiente pro MVP).

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @barbearia/web typecheck && pnpm --filter @barbearia/web lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/perfil/page.tsx pnpm-lock.yaml
git commit -m "feat(web): painel do dono exibe link do app do cliente (/b/:slug)"
```

---

## Verificação final (QA)

- [ ] `pnpm --filter @barbearia/mobile-customer test` → verde (harness + tenant-slug + tenant-context).
- [ ] `pnpm --filter @barbearia/mobile-customer typecheck` e `lint` → exit 0.
- [ ] `pnpm --filter @barbearia/api test` → 77/77 (backend intocado).
- [ ] Smoke manual: deep link `/b/:slug` → abas; guest agenda; login adota; Agenda/Perfil pedem login; sem slug → "abra pelo link".

## Notas de não-escopo (do spec)

- Deferred deep link pleno (Branch/AppsFlyer), build nativo white-label por barbearia, prefill do checkout pelo perfil, push, multi-unidade.
