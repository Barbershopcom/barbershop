# Assets — mobile-business

Imagens referenciadas em `app.json`. Mesmas specs do mobile-customer
mas **identidade visual distinta** — esse app é pro barbeiro/admin, não
cliente. Considera cores/símbolos diferentes pra evitar confusão se
instalado lado a lado.

## Arquivos necessários

| Arquivo                  | Tamanho       | Formato | Uso                                                  |
|--------------------------|---------------|---------|------------------------------------------------------|
| `icon.png`               | 1024×1024     | PNG     | App icon principal (iOS + Android legacy)            |
| `adaptive-icon.png`      | 1024×1024     | PNG     | Foreground Android Adaptive Icon (com transparência) |
| `splash.png`             | 1284×2778     | PNG     | Splash screen (Expo redimensiona)                    |
| `favicon.png`            | 48×48         | PNG     | Favicon do build web                                 |

> Sem `notification-icon.png` — mobile-business não usa push ainda (só
> admin web). Quando virar relevante, adiciona aqui + plugin no app.json.

## Specs visuais

- **Cor primária:** `#1a365d` (mesmo navy do customer)
- **Diferencial visual:** considere fundo escuro ou cor secundária pra
  diferenciar do customer no springboard do telefone
- **Background splash:** `#ffffff`

## Quick start — defaults Expo

Igual ao mobile-customer:

```powershell
cd $env:TEMP
npx create-expo-app temp-assets --template default
Copy-Item temp-assets/assets/* C:\Users\qualq\Documents\barbearia_v2\apps\mobile-business\assets\ -Force
Remove-Item temp-assets -Recurse -Force
```

## Designer

Recomendação: o icone do business pode ter elemento adicional (relógio,
tesoura+lupa, ou cor escura) pra deixar claro que é o app **interno**.
Cliente nunca vê esse icone exceto se barbeiro mostrar.
