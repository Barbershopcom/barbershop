import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useTenant } from '@/lib/tenant-context';

/**
 * Entrada "pelada" (/). Quando o tenant já resolveu (slug persistido),
 * manda pra /b/{slug} pra a barbearia ficar na URL. Os estados
 * loading/no-tenant/error são tratados no _layout raiz — aqui só o caso ready.
 */
export default function Index() {
  const tenant = useTenant();
  if (tenant.status === 'ready') {
    return <Redirect href={`/b/${tenant.tenant.slug}`} />;
  }
  return <View className="flex-1 bg-background" />;
}
