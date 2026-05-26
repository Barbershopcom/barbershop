import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/session';

/**
 * Roteador inicial. Não renderiza UI própria — só decide pra onde mandar.
 *   loading | linking      → spinner (linking não pode ir pra /inicio: (app) layout
 *                            exige status='linked' e devolveria pra cá → loop infinito)
 *   anonymous              → /login
 *   link-failed            → /sem-vinculo
 *   linked                 → /inicio
 */
export default function Index() {
  const { state } = useSession();

  if (state.status === 'loading' || state.status === 'linking') {
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

  return <Redirect href="/inicio" />;
}
