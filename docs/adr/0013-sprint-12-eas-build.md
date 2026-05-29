# ADR-013: Sprint 12 — EAS Build + distribuição mobile

- **Data:** 2026-05-29
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-003 e ADR-010)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Mobile customer (Sprint 9) e mobile business (Sprint 2) estão completos
mas só rodam em **Expo Go** — fricção pro user final. Pra cliente real
instalar do telefone, precisa app na TestFlight (iOS) ou Internal Track
(Google Play).

Além disso, **push notifications** (Sprint 9 Phase 6) só funcionam de
verdade em apps com push credentials registradas. Expo Go usa um sandbox
shared. Sem EAS Build, push é demo, não produto.

Sprint 10 (ADR-011) deliberadamente pulou EAS pra focar na web. Sprint
12 fecha o loop: prepara configs + docs pra user gerar builds reais e
submeter pras stores.

---

## Decisões

### 1. **EAS Build (managed)** — não bare workflow

Mantém managed workflow do Expo. Vantagens:
- Sem precisar de Xcode/Android Studio locais
- EAS roda builds na cloud (free tier: 30 builds/mês)
- Push credentials gerenciadas pelo EAS Submit

Bare workflow só fica relevante quando precisar de native module custom
sem Expo support — não é o caso ainda.

### 2. **3 perfis de build**: development / preview / production

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "distribution": "store" }
  }
}
```

- **development**: dev client custom (instala via QR ou link interno), pra
  testar features nativas que Expo Go não cobre (push real, deeplinks)
- **preview**: APK Android + IPA iOS internas pra share com beta testers
  por link (sem TestFlight/Play Store)
- **production**: build final pra App Store + Google Play

MVP usa **preview** (mais rápido, sem store review). Production é quando
estiver maduro.

### 3. **Bundle identifiers** já estão decididos no `app.json` de cada app

- `com.barbearia.customer` (mobile-customer)
- `com.barbearia.business` (mobile-business)

Convenção `reverse-DNS`. Quando comprarmos domínio próprio (Sprint 13+),
trocamos pra `app.<dominio>.<role>`.

### 4. **Versionamento automático via EAS** — `autoIncrement`

`eas.json` com `"autoIncrement": "buildNumber"` (iOS) e `"versionCode"`
(Android). EAS bumpa o build number a cada build, mantém `version` no
controle do dev (semver via app.json).

Sem isso, errar de subir mesma build number = rejeição na store.

### 5. **Push credentials** geradas pelo EAS

EAS Submit (ou primeiro build production) gera:
- **iOS**: Push Notification Key via Apple Dev API
- **Android**: FCM credentials via Google Play Console

User precisa de **Apple Developer Program** ($99/ano) e **Google Play
Console** ($25 uma vez). Sem isso, push real não funciona — mas o flow
do app (sem push) ainda funciona pra testes.

### 6. **Splash + icon** — placeholders agora, design depois

App icons e splash screens ficam como **placeholders genéricos** nesse
sprint. Quando o user tiver identidade visual definida (logo, paleta),
substitui os PNGs.

Expo CLI tem comando `expo customize` que gera defaults — vamos
referenciar isso na doc. Sem icone real → build passa mas store rejeita.

### 7. **Permissions** minimalistas — só notificações

Mobile customer só precisa de **notifications** (push reminders). Sem
camera, sem localização, sem contatos, sem nada. Mobile business
mesma coisa.

Plugin `expo-notifications` no `app.json` cuida da config básica.
Não declaro permissions extras — Apple rejeita "permission solicited
but never used".

### 8. **Sem CI/CD pro EAS** nessa sprint

Build manual: `eas build --profile preview --platform android`. Sem
GitHub Actions trigger. Quando ficar repetitivo, automatiza.

### 9. **Submit via EAS Submit**

`eas submit --platform ios|android` toma o build do EAS e submete pro
App Store Connect / Play Console. User precisa só credenciais Apple/Play.

Pra TestFlight Internal Track, EAS Submit faz tudo. External Test e
Production exigem review da Apple/Google (1-7 dias).

### 10. **Privacy Policy URL** obrigatório nas duas stores

Apple e Google exigem link pra privacy policy. Vou criar um `/privacy`
placeholder no Vercel apontando pra texto genérico de privacy policy
(LGPD-friendly). User customiza quando legal aprovar.

---

## Trade-offs aceitos

- **Sem release production** — só preview (APK/IPA internos). Production
  quando passar QA real.
- **Icons placeholder** — visual não-profissional até design ficar pronto.
- **Sem CI/CD** — builds manuais. Tudo bem pra dev solo.
- **Apple Dev Program $99/ano** — gasto necessário pra iOS. Android é mais
  barato ($25 once). Se gasto for blocker, **Android primeiro**.
- **Privacy policy básica** — gerada por template. Adv ler depois.

---

## Roadmap em fases

| Fase | Entrega                                                                 |
|------|-------------------------------------------------------------------------|
| 1    | ADR + `eas.json` em mobile-customer e mobile-business + bundle IDs       |
| 2    | `app.json` mobile-customer: permissions, plugins, version handling      |
| 3    | `app.json` mobile-business: mesma estrutura                              |
| 4    | Estrutura de assets + docs do que falta gerar (icon, splash)            |
| 5    | `docs/eas-build.md` step-by-step (Apple/Play setup, build, submit)       |

Cada fase fecha com commit. Sem testes automatizados — manual via builds
preview.
