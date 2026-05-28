import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Registra o device pra receber push notifications via Expo Push Service
 * (ADR-010 §5). Best-effort — retorna null em caso de:
 *  - Simulator/web (push só funciona em device físico)
 *  - Permissão negada pelo user
 *  - Sem projectId configurado em app.json (build local)
 *  - Erro inesperado
 *
 * O token é formato `ExponentPushToken[xxx]`. API valida prefixo antes
 * de enviar (PushService.send filtra inválidos).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push real não funciona em simulator/web; OK pra dev.
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a365d',
      });
    }

    // Cast — tipos do expo-notifications no SDK 54 importam PermissionResponse
    // de 'expo' que não é resolvível pelo tsc do monorepo.
    const existing = (await Notifications.getPermissionsAsync()) as unknown as {
      granted: boolean;
      canAskAgain: boolean;
    };
    let granted = existing.granted;
    if (!granted) {
      const requested = (await Notifications.requestPermissionsAsync()) as unknown as {
        granted: boolean;
      };
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch {
    return null;
  }
}
