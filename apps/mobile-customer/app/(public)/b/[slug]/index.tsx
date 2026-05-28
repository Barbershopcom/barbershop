import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

/**
 * Landing da barbearia. Phase 2 vai implementar:
 * - fetch GET /public/tenants/:slug
 * - fetch GET /public/tenants/:slug/services
 * - lista de cards com serviço + preço + botão "Agendar"
 */
export default function TenantLanding() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
      <ActivityIndicator color="#1a365d" />
      <Text className="text-sm text-slate-500">Carregando {slug}...</Text>
    </View>
  );
}
