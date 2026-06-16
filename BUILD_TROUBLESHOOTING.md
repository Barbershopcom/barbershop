# 🔧 Build Troubleshooting - Barbearia Mobile Customer

## Build #1 - FAILED ❌

**Build ID:** d4466e42-730e-4ca2-90c3-21748d225e68  
**Status:** Failed  
**Phase:** Bundle JavaScript  
**Error:** Unknown error - See logs

### Possíveis Causas

1. **Dependência faltando** → npm install não sincronizou tudo
2. **Cache stale** → Versão anterior conflitando
3. **Importação inválida** → Módulo não encontrado em tempo de bundling
4. **TypeScript compilação** → TS OK localmente mas falha no metro bundler
5. **Arquivo corrompido** → Algum arquivo não sincronizou corretamente

### Ações Tomadas

✅ **Verificações Locais:**
- [x] TypeScript type-check → ✅ OK (sem erros)
- [x] Expo prebuild → ✅ OK (sem erros)
- [x] npm cache clean → ✅ Limpo

✅ **Build #2 - RETRY:**
- [x] Cache completo limpo (--clear-cache)
- [x] Aguardando resultado...

---

## Build #2 - EM ANDAMENTO ⏳

**Started:** 2026-06-15 14:30 UTC  
**Expected:** 10-15 minutos  
**Flags:** --clear-cache (força rebuild completo)

**Dashboard:** https://expo.dev/accounts/jaja./projects/barbearia-customer/builds

---

## Debug Steps Se Falhar Novamente

### 1. Verificar imports específicos

```bash
# Procurar por imports que podem falhar
grep -r "from '@'" src/ | grep -v node_modules

# Procurar por requires dinâmicos
grep -r "require(" src/
```

### 2. Verific dependendias

```bash
# Reinstalar dependências
cd apps/mobile-customer
rm -rf node_modules
npm install

# Verificar dependências faltando
npm ls --depth=0
```

### 3. Verificar app.json

```json
{
  "name": "barbearia-customer",
  "slug": "barbearia-customer",
  "version": "0.0.1",
  "assetBundlePatterns": ["**/*"],
  "plugins": [
    "expo-font",
    "expo-router",
    "expo-secure-store"
  ]
}
```

### 4. Limpar tudo

```bash
cd apps/mobile-customer

# Limpar tudo
rm -rf android/
rm -rf .expo/
rm -rf node_modules/
rm -rf .turbo/
npm cache clean --force

# Reinstalar
npm install

# Rebuild
npx expo prebuild --clean
```

### 5. Test localmente

```bash
# Start dev server
npx expo start --clear

# No terminal aberto:
# - Press 'a' for Android emulator
# - Press 'w' for web (mais fácil para debug)

# Observe for errors
```

### 6. Se persistir - Build via EAS CLI direct

```bash
eas build --platform android --profile preview \
  --clear-cache \
  --non-interactive \
  --verbose  # Aumenta output (mostra erros específicos)
```

---

## Build Success Criteria

✅ Quando sucesso:
1. Status = "Finished"
2. APK disponível para download
3. QR code no dashboard para Expo Go
4. Build log sem erros no "Bundle JavaScript" phase

---

## Se Build #2 Suceder

1. Scan QR no dashboard
2. Instale no Android (emulador ou device)
3. Teste fluxo:
   - Splash (2s)
   - Onboarding
   - Login
   - Browse barbershops
   - Agende

---

## Common Errors & Fixes

| Error | Causa | Fix |
|-------|-------|-----|
| "Unknown error" | Vago - pode ser JS bundling | `--clear-cache` + `npm install` |
| "Module not found" | Import inválido | Verificar imports, namespaces |
| "Type error" | TypeScript issue | rodar `tsc --noEmit` localmente |
| "Port in use" | Dev server járodando | Kill ou usar porta diferente |

---

## Monitoring

**Real-time:**
1. Abra https://expo.dev
2. Account: jarilson.rk@gmail.com
3. Project: barbearia-customer
4. Builds tab → veja a build atual
5. Click build ID para logs detalhados

**Logs:**
- Push logs: What was sent to EAS
- Build logs: Compilation phase
- Bundle logs: JavaScript bundling
- Native logs: Gradle build (Android)

---

## Status: BUILD #2 IN PROGRESS ⏳

Check back in 15 minutes for result!

Timestamp: 2026-06-15 14:30 UTC
