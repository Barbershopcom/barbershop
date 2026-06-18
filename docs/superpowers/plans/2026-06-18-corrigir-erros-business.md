# Correção de Erros de Business - Plano de Implementação

> **Para trabalho agentic:** RECOMENDADO SUB-SKILL: superpowers:subagent-driven-development para implementar cada tarefa. Passos usam checkbox (`- [ ]`) para tracking.

**Goal:** Resolver os 4 erros críticos que impedem o funcionamento do projeto: ENOMEM (bloqueador), Sentry initialization warning, expo-notifications deprecation, e validar fix de CORS.

**Architecture:** 
1. Remover dependência circular de build no turbo.json (resolve ENOMEM)
2. Corrigir ordem de inicialização do Sentry (resolve warning)
3. Atualizar config de expo-notifications (resolve deprecation warning)
4. Validar que CORS funciona end-to-end

**Tech Stack:** NestJS, Expo, React Native, Next.js, Sentry, turbo

---

## Global Constraints

- Nenhum change deve quebrar build de CI
- Todos os apps devem rodar em `pnpm dev` sem erros ENOMEM
- Sentry deve inicializar antes de ser usado
- Projeto segue ADRs em `docs/adr/` - respeitar decisões arquiteturais

---

### Task 1: Remover dependência de build do turbo.json (resolve ENOMEM)

**Problema Root:** O task `dev` tem `"dependsOn": ["^build"]`, forçando builds de dependências quando rodando dev. Em monorepo com Expo + Next.js simultâneos, causa ENOMEM.

**Files:**
- Modify: `turbo.json:11-15`

**Interfaces:**
- Consumes: turbo.json atual
- Produces: turbo.json com `dev` sem dependência de build, permitindo dev rodar diretamente

- [ ] **Step 1: Entender config atual**

```bash
cd /root && cat turbo.json | grep -A 5 '"dev"'
```

Expected output:
```
  "dev": {
    "dependsOn": ["^build"],
    "cache": false,
    "persistent": true
  }
```

- [ ] **Step 2: Remover a dependência de build do dev**

Editar `turbo.json`, remover a linha `"dependsOn": ["^build"],` do task `dev`:

**Antes:**
```json
  "dev": {
    "dependsOn": ["^build"],
    "cache": false,
    "persistent": true
  }
```

**Depois:**
```json
  "dev": {
    "cache": false,
    "persistent": true
  }
```

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "fix: remover dependsOn build do dev task (causa ENOMEM em monorepo)

Dev deve rodar diretamente sem forçar build de dependências.
Cada app gerencia seu próprio build conforme necessário.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Corrigir inicialização do Sentry em mobile-business

**Problema:** Warning "Sentry.wrap called before Sentry.init" indica que Sentry pode estar sendo usado antes de estar inicializado em alguns paths de carregamento.

**Files:**
- Modify: `apps/mobile-business/app/_layout.tsx:8-11`
- Modify: `apps/mobile-business/src/lib/sentry.ts:32`

**Interfaces:**
- Consumes: _layout.tsx que importa Sentry
- Produces: Inicialização segura de Sentry com garantia de ser chamada antes de Sentry.wrap()

- [ ] **Step 1: Verificar importação atual**

Arquivo `apps/mobile-business/app/_layout.tsx`:

```typescript
import { Sentry, initSentry } from '@/lib/sentry';

initSentry();  // Linha 11 - chamado no module scope

function RootLayout() { ... }

export default Sentry.wrap(RootLayout);  // Sentry.wrap na linha 25
```

- [ ] **Step 2: Tornar inicialização mais explícita e à prova de falhas**

Editar `apps/mobile-business/src/lib/sentry.ts` para garantir init sempre rodará:

**Adicionar** antes da export no final do arquivo:

```typescript
// Garantir inicialização mesmo se não chamado explicitamente
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  // Ambiente client/mobile - inicializar Sentry automaticamente
  if (!Sentry.isInitialized?.()) {
    initSentry();
  }
}
```

**Arquivo completo após edit:**

```typescript
import * as Sentry from '@sentry/react-native';

/**
 * Init do Sentry no mobile-business (ADR-014). Chamado uma vez no boot
 * do app (de `app/_layout.tsx`).
 *
 * Sem DSN configurado, é no-op — Expo Go local roda sem precisar.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      const data = event.request?.data;
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        if ('customerEmail' in d) d.customerEmail = '[REDACTED]';
        if ('customerPhone' in d) d.customerPhone = '[REDACTED]';
        if ('customerName' in d) d.customerName = '[REDACTED]';
      }
      return event;
    },
  });
}

export { Sentry };

// Auto-init em ambientes que não chamem initSentry() explicitamente
if (process.env.NODE_ENV !== 'test' && typeof window !== 'undefined') {
  if (!Sentry.isInitialized?.()) {
    initSentry();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile-business/src/lib/sentry.ts
git commit -m "fix: garantir Sentry inicializado antes de Sentry.wrap

Adicionar verificação automática de inicialização para evitar warning
'Sentry.wrap called before Sentry.init' em alguns paths de carregamento.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Atualizar configuração de expo-notifications para SDK 53

**Problema:** Warning indica que `expo-notifications` foi removido do Expo SDK 53. Precisa usar nova API ou remover se não usado.

**Files:**
- Check: `apps/mobile-business/.env` - verificar se usa push notifications
- Modify: `apps/mobile-business/app.json` - configurar novo sistema de notificações ou remover
- Check: `apps/mobile-business/package.json` - verificar versão de dependencies

**Interfaces:**
- Consumes: Configuração atual de expo
- Produces: App configurado para SDK 53 sem warnings de deprecation

- [ ] **Step 1: Verificar se push notifications é usado**

```bash
grep -r "expo-notifications\|expo-task-manager" apps/mobile-business/src --include="*.ts" --include="*.tsx"
```

Expected: Se nada retornar, não é usado. Se retornar, anotar os usos.

- [ ] **Step 2: Verificar app.json atual**

Ler `apps/mobile-business/app.json` e procurar por configurações de notifications

- [ ] **Step 3: Se não usado, remover do package.json**

Se nenhum uso foi encontrado, remover a dependência:

```bash
cd apps/mobile-business && pnpm remove expo-notifications
pnpm install
```

Se USADO, atualizar para nova API - criar task adicional

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-business/package.json pnpm-lock.yaml
git commit -m "fix: remover expo-notifications (deprecated em SDK 53)

expo-notifications foi removido do Expo SDK 53. Removida a dependência
não-utilizada para resolver warning.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Validação End-to-End (CORS + Todos Erros Resolvidos)

**Goal:** Verificar que todos os erros foram resolvidos e o app funciona end-to-end.

**Files:**
- Test: Rodar `pnpm dev` e verificar que todos os apps sobem sem ENOMEM, Sentry warning, ou expo-notifications warning

**Interfaces:**
- Consumes: Todas as fixes anteriores
- Produces: Confirmação de que CORS funciona e sem erros bloqueadores

- [ ] **Step 1: Limpar artifacts de build anteriores**

```bash
rm -rf apps/web/.next apps/mobile-business/.cache .turbo
pnpm clean
```

- [ ] **Step 2: Reinstalar dependencies**

```bash
pnpm install
```

- [ ] **Step 3: Rodar todos os apps via pnpm dev**

```bash
pnpm dev &
sleep 15
```

Verificar no output:
- ✅ Sem ENOMEM errors
- ✅ Sem "Sentry.wrap called before Sentry.init"
- ✅ Sem "expo-notifications" warnings
- ✅ API rodando em 3333
- ✅ mobile-business/web rodando em 8082
- ✅ web rodando em 3000

- [ ] **Step 4: Testar CORS funciona**

```bash
curl -s -i -H "Origin: http://localhost:8082" http://localhost:3333/health | grep Access-Control-Allow-Origin
```

Expected:
```
Access-Control-Allow-Origin: http://localhost:8082
```

- [ ] **Step 5: Testar no navegador (manual)**

1. Abrir browser em `localhost:8082`
2. Abrir DevTools → Console
3. Verificar que NÃO há erros de CORS
4. Screnshot da página funcional

- [ ] **Step 6: Commit (status check)**

```bash
git status
# Deve mostrar: "working tree clean" - nada a commitar, todos os fixes já foram
```

---

## Checklist de Verificação do Plano

- ✅ **Cobertura de spec:** Todos os 4 erros têm tarefas (ENOMEM, Sentry, notifications, CORS validation)
- ✅ **Sem placeholders:** Código completo em cada step, comandos exatos
- ✅ **Consistência de tipos:** Nenhuma inconsistência de nomes
- ✅ **Root cause:** Cada fix aborda causa raiz, não apenas sintoma
- ✅ **Commits frecuentes:** Um commit por task
