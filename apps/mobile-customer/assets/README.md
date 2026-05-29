# Assets — mobile-customer

Imagens referenciadas em `app.json`. Gere todos antes do primeiro
`eas build --profile preview` ou `--profile production` (development
build aceita ausência mas sai feio).

## Arquivos necessários

| Arquivo                  | Tamanho       | Formato | Uso                                            |
|--------------------------|---------------|---------|------------------------------------------------|
| `icon.png`               | 1024×1024     | PNG     | App icon principal (iOS + Android legacy)      |
| `adaptive-icon.png`      | 1024×1024     | PNG     | Foreground do Android Adaptive Icon (com transparência) |
| `splash.png`             | 1284×2778     | PNG     | Splash screen (iPhone 13 Pro Max baseline, Expo redimensiona) |
| `notification-icon.png`  | 96×96         | PNG     | Ícone das push notifications no Android (monocromático, com transparência) |
| `favicon.png`            | 48×48         | PNG     | Favicon do build web                           |

## Specs visuais

- **Cor primária:** `#1a365d` (navy do design tokens)
- **Cor secundária:** `#357BE4` (blue do brand)
- **Background splash:** `#ffffff` (puro branco)
- **Background icon (Android):** `#ffffff` no `app.json` — adaptive icon
  foreground deve ter transparência

## Quick start — defaults Expo

Se ainda não tem design, gera defaults assim:

```powershell
# Cria um app temp pra extrair os assets default do Expo
cd $env:TEMP
npx create-expo-app temp-assets --template default
Copy-Item temp-assets/assets/* C:\Users\qualq\Documents\barbearia_v2\apps\mobile-customer\assets\ -Force
Remove-Item temp-assets -Recurse -Force
```

Defaults têm logo do Expo — substitui antes de submeter pras stores.

## Designer

Quando contratar designer pra logo final:

1. Logo principal em SVG vetorial
2. Versões PNG em 1024×1024 (icon) + 96×96 (notification monocromático)
3. Splash com logo centrado em fundo branco (1284×2778 baseline)
4. Adaptive icon: logo bem dentro de safe zone (66% central) sobre transparência

## Notification icon (Android specific)

Importante: Android exige ícone **monocromático** (só branco + alpha)
pro notification icon. Colorido aparece como quadradinho cinza.

Spec correta:
- 96×96 PNG
- Só pixels brancos (`#FFFFFF`) ou transparente
- Logo simples (ícone de tesoura, navalha, ou letra "B")
