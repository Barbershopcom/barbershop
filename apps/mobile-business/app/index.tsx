import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/session';

/**
 * Roteador inicial. Não renderiza UI própria — só decide pra onde mandar.
 *   loading                → spinner
 *   anonymous              → /login
 *   linking | linked       → /inicio (linked mostra tela real, linking mostra spinner)
 *   link-failed            → /sem-vinculo
 */
export default function Index() {
  const { state } = useSession();

  if (state.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#357BE4" />
      </View>
    );
  }

  if (state.status === 'anonymous') {
    return <Redirect href="/login" />;
  }

  if (state.status === 'link-failed') {
    return <Redirect href="/sem-vinculo" />;
  }

  // linking | linked → vai pra inicio (tela trata os 2 sub-estados)
  return <Redirect href="/inicio" />;
}
