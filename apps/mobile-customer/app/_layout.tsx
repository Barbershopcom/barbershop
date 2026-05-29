import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Sentry, initSentry } from '@/lib/sentry';
import { SessionProvider } from '@/lib/session';

initSentry();

function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}

export default Sentry.wrap(RootLayout);
