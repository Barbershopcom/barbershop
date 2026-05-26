import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

/**
 * Banner global "Sem conexão". Mostra quando NetInfo reporta offline.
 *
 * Não bloqueia chamadas — só dá feedback visual. Se o usuário tentar salvar
 * offline, o fetch falha e a tela mostra o erro normal. Isso é melhor que
 * tentar interceptar tudo pré-emptivamente (NetInfo às vezes mente sobre
 * conectividade real, ex: wifi conectado mas sem internet).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => {
      // isConnected pode ser null no warmup — só consideramos offline quando explicitamente false.
      const isOffline = s.isConnected === false;
      setOffline(isOffline);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View
      style={{ paddingTop: Platform.OS === 'ios' ? 44 : 24 }}
      className="bg-destructive px-4 pb-2"
    >
      <Text className="text-center text-xs font-semibold text-white">
        Sem conexão — verifique sua internet
      </Text>
    </View>
  );
}
