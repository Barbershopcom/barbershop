import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
import { Sentry, initSentry } from '@/lib/sentry';
import { SessionProvider } from '@/lib/session';

initSentry();

function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <View className="flex-1 bg-background">
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />
      </View>
    </SessionProvider>
  );
}

export default Sentry.wrap(RootLayout);
