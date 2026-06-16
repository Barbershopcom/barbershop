#!/bin/bash
echo "🔨 Iniciando EAS Build para Android (Preview)..."
echo "Project: barbearia-customer"
echo "Profile: preview (APK interno)"
echo "---"

eas build --platform android --profile preview

echo ""
echo "✅ Build iniciado!"
echo "📱 Acesse https://expo.dev para monitorar o progresso"
echo "⏱️ Tempo estimado: 10-15 minutos"
