import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useTenant } from '@/lib/tenant-context';

export default function BuscaScreen() {
  const tenant = useTenant();
  if (tenant.status !== 'ready') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }
  return <Redirect href={`/(public)/agendamento/${encodeURIComponent(tenant.tenant.slug)}`} />;
}
