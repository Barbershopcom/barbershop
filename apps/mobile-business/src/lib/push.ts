import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Registra o device do BARBEIRO pra push (ADR-017 §6). Best-effort —
 * retorna null em simulator/web, permissão negada, sem projectId, ou erro.
 *
 * Token formato `ExponentPushToken[xxx]`. Enviado pro backend via
 * POST /me/devices, que upserta em employee_devices ligado ao AppUser.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Agendamentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a365d',
      });
    }

    // Cast — tipos do expo-notifications no SDK 54 importam PermissionResponse
    // de 'expo' que não resolve no tsc do monorepo.
    const existing = (await Notifications.getPermissionsAsync()) as unknown as {
      granted: boolean;
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
