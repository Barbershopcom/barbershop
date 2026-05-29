# EAS Build & Submit — guia step-by-step

Como gerar APK Android e IPA iOS dos mobile-customer e mobile-business
via **EAS Build**, e submeter pra TestFlight (iOS) / Play Internal Track
(Android). ADR de referência: [ADR-013](adr/0013-sprint-12-eas-build.md).

---

## 0. Pré-requisitos

### Acesso

- Conta no [Expo](https://expo.dev) (free) — provisiona builds
- **Android Internal Track**:
  - Google Play Console ($25 one-time) — [registro aqui](https://play.google.com/console/signup)
- **iOS TestFlight**:
  - Apple Developer Program ($99/ano) — [enrollment aqui](https://developer.apple.com/programs/)
  - Mac não é estritamente obrigatório (EAS roda na cloud), mas
    `eas submit` exige App Store Connect API key

### Sem Apple Dev? Vai de Android primeiro

Android Internal Track ($25 once) cobre 95% do uso real no Brasil. Pode
fazer iOS depois quando vier demanda real do AppStore.

### Local

```powershell
pnpm add -g eas-cli@latest
# Confirma instalação
eas --version
```

### Privacy Policy URL

Apple e Google exigem link público pra privacy policy. Use o template
LGPD-friendly no Vercel:

```powershell
# Cria página no apps/web (TODO criar /privacy/page.tsx — Sprint 13+)
# Por ora, gere uma URL temporária:
# https://www.freeprivacypolicy.com/free-privacy-policy-generator/
# Salve o HTML em apps/web/public/privacy.html
# URL final: https://barbearia-web.vercel.app/privacy.html
```

---

## 1. Setup inicial (uma vez)

### 1.1. Login no Expo

```powershell
cd apps/mobile-customer
eas login
# Usuário/senha do expo.dev
```

### 1.2. Inicializa projeto EAS

```powershell
eas init
```

Esse comando:
- Cria projeto no expo.dev (se não existir)
- Preenche `app.json` → `extra.eas.projectId` (atualmente placeholder)

Repete pro mobile-business:

```powershell
cd ../mobile-business
eas init
```

### 1.3. Confirma configuração

```powershell
cd ../mobile-customer
eas config --profile preview
# Mostra o JSON resolvido — confere se distribution, bundleIdentifier, etc estão certos
```

---

## 2. Assets — gere os PNGs

Antes do primeiro build:

```powershell
# Opção A: defaults Expo (rápido, pra teste)
cd $env:TEMP
npx create-expo-app temp-assets --template default
Copy-Item temp-assets/assets/* C:\Users\qualq\Documents\barbearia_v2\apps\mobile-customer\assets\ -Force
Copy-Item temp-assets/assets/* C:\Users\qualq\Documents\barbearia_v2\apps\mobile-business\assets\ -Force
Remove-Item temp-assets -Recurse -Force
```

Opção B: contrata designer ou usa Figma com specs em
`apps/mobile-customer/assets/README.md`.

Stores **rejeitam** apps com placeholder Expo. Pra MVP interno (TestFlight
beta / Internal Track), passa.

---

## 3. Build Android (preview APK)

```powershell
cd apps/mobile-customer
eas build --profile preview --platform android
```

EAS pergunta:
- **Generate a new Android Keystore?** → Sim (EAS gerencia, sem dor)
- Aceita defaults

Build leva ~15-25 min na cloud. Acompanha o link que aparece. No fim,
EAS te dá link pra baixar o APK.

**Instala no celular:**
1. Abre o link no Android
2. Permite "Instalar de fontes desconhecidas" se pedir
3. Instala APK

App aponta pra **`EXPO_PUBLIC_API_URL`** que veio do `eas.json` do
profile preview — sem env definida, fallback pra `localhost:3333` (não
funciona em device). Pra prod:

```powershell
# Edita eas.json e adiciona env no profile preview:
# "env": { "EXPO_PUBLIC_API_URL": "https://barbearia-api.up.railway.app",
#          "EXPO_PUBLIC_SUPABASE_URL": "...",
#          "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..." }
```

Rebuild após edit. EAS usa env na hora do bundle JS.

---

## 4. Build iOS (preview IPA)

**Pré-requisito:** Apple Developer Program ativo + Mac não obrigatório
(EAS gera certificados via Apple API se você fornecer credenciais).

```powershell
cd apps/mobile-customer
eas build --profile preview --platform ios
```

EAS pergunta:
- **Apple ID** → seu email Apple Dev
- **App-specific password** ou Apple ID auth via browser
- **Generate provisioning profile?** → Sim
- **Bundle identifier `com.barbearia.customer` available?** → registra
  no App Store Connect se pedir

Build sai como `.ipa`. Pra instalar em device:
- Via TestFlight (recomendado — sub-section 6)
- Via Diawi/Expo URL (mais flexível mas usuário precisa registrar UDID
  do device se for ad-hoc)

---

## 5. Build production (pras stores)

Mesma command, profile diferente:

```powershell
eas build --profile production --platform android
eas build --profile production --platform ios
```

Diferenças do `production`:
- Android: gera `.aab` (Android App Bundle) — formato pra Play Store
- iOS: gera `.ipa` assinado pra distribution
- `autoIncrement: true` → buildNumber++ no app.json

---

## 6. Submit Android → Play Internal Track

```powershell
cd apps/mobile-customer
eas submit --platform android --profile production --latest
```

EAS pergunta:
- **service-account.json path** — gera no Play Console:
  1. Play Console → Setup → API access
  2. Cria service account na Cloud Console (link no Play)
  3. Concede acesso "Internal track" pra essa SA
  4. Salva o JSON em `apps/mobile-customer/play-service-account.json` (gitignore!)
- Submete pro Internal Track automaticamente

Adicione testers no Play Console → Testing → Internal testing → testers.

---

## 7. Submit iOS → TestFlight

```powershell
cd apps/mobile-customer
eas submit --platform ios --profile production --latest
```

EAS pergunta:
- **App Store Connect API Key** — gera em https://appstoreconnect.apple.com/access/api
  - Cria key com role "Developer"
  - Baixa o `.p8`, anota Key ID + Issuer ID
  - EAS guarda criptografado
- Submete pro App Store Connect

Após review automática (~30 min - 1h), build aparece no TestFlight.
Convida testers via email no App Store Connect → TestFlight → Internal
Testing.

---

## 8. Iteração rápida — OTA Updates via EAS Update

Pra fixes de JS/TS sem rebuild nativo:

```powershell
pnpm add -D expo-updates
# Configura no app.json:
# "updates": { "url": "https://u.expo.dev/<projectId>" }
# "runtimeVersion": { "policy": "sdkVersion" }

eas update --branch preview --message "fix: typo no email"
```

Apps em preview/production buscam updates dessa branch e aplicam.
Restrição: não funciona pra mudanças nativas (novas libs, permissions).

---

## 9. Repete pro mobile-business

Todos os comandos acima vão exatamente igual no `apps/mobile-business/`.
Bundle IDs já estão separados (`com.barbearia.business`).

---

## 10. Checklist final

- [ ] EAS CLI instalado e logado
- [ ] `eas init` rodado em ambos apps → projectId preenchido
- [ ] Assets gerados (icon, splash, etc.)
- [ ] Env vars no `eas.json` preview profile apontam pra Railway prod
- [ ] Privacy policy URL pública configurada
- [ ] Android: APK preview instalado e funcionando
- [ ] iOS: IPA preview instalado e funcionando (se Apple Dev ativo)
- [ ] Play Console: service-account.json gerado
- [ ] App Store Connect: API key gerada
- [ ] Production builds submetidos
- [ ] Testers adicionados (Internal Testing + TestFlight)

---

## 11. Custos esperados

| Item | Custo |
|---|---|
| EAS Build free | 30 builds/mês (suficiente pra iteração) |
| Apple Developer Program | $99/ano (~R$ 550/ano) |
| Google Play Console | $25 once (~R$ 140) |
| EAS Update free | 1000 MAU |
| **Total ano 1** | ~R$ 700 (Apple+Play) |

Sem Apple Dev: só Android, custo ano 1 ~R$ 140.

---

## 12. Troubleshooting

**Build falha "Bundle ID already exists"**: alguém já registrou esse
`com.barbearia.customer`. Troca pra `com.<seunome>.barbearia.customer`
no `app.json` E no `eas.json`.

**iOS build "missing provisioning profile"**: confirme que o
bundleIdentifier no app.json bate com o app criado no App Store Connect.

**Android build "keystore mismatch"**: se você gerou keystore manualmente
antes do EAS gerenciar, exporta com `eas credentials` → import.

**Push notifications não funcionam após build**: confirma que
`expo-notifications` plugin tá em `app.json` (Phase 2 já adicionou)
e que devices testes estão registrados no Apple Push Service /
Firebase Cloud Messaging via EAS Submit.

**App crash imediato em prod**: provavelmente env vars não definidas.
Cheque que `eas.json` preview/production tem `env.EXPO_PUBLIC_API_URL`
apontando pra URL Railway HTTPS válida.
