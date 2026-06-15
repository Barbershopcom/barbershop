import '../global.css';

import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BookingProvider } from '@/lib/booking-context';
import { Sentry, initSentry } from '@/lib/sentry';
import { SessionProvider, useSession } from '@/lib/session';

initSentry();

function RootLayoutNav() {
  const { state } = useSession();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem('onboarding_done');
      setOnboardingDone(done === 'true');
    })();
  }, []);

  // Ainda carregando
  if (onboardingDone === null || state.status === 'loading') {
    return (
      <View className="flex-1 bg-background">
        <StatusBar style="dark" />
      </View>
    );
  }

  // 1. Splash/Onboarding → se nunca viu
  if (!onboardingDone) {
    return (
      <>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </>
    );
  }

  // 2. Login → se não autenticado
  if (state.status === 'anonymous') {
    return (
      <>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      </>
    );
  }

  // 3. App completo → se autenticado
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

function RootLayout() {
  return (
    <SessionProvider>
      <BookingProvider>
        <RootLayoutNav />
      </BookingProvider>
    </SessionProvider>
  );
}

export default Sentry.wrap(RootLayout);
