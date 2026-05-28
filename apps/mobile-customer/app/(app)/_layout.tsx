import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/session';

/**
 * Gate de auth pras rotas (app)/. Cliente sem login é redirecionado
 * pra /login (não pra home, porque chegou aqui buscando feature
 * autenticada — histórico ou perfil).
 */
export default function AppLayout() {
  const { state } = useSession();

  if (state.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }
  if (state.status === 'anonymous') {
    return <Redirect href="/login" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
