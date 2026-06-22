import '../global.css';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BookingProvider } from '@/lib/booking-context';
import { Sentry, initSentry } from '@/lib/sentry';
import { SessionProvider, useSession } from '@/lib/session';
import { TenantProvider, useTenant } from '@/lib/tenant-context';

SplashScreen.preventAutoHideAsync();

initSentry();

function NoTenantScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="font-display text-xl font-bold text-foreground">Abra pelo link da sua barbearia</Text>
      <Text className="text-center text-sm text-foreground-muted">
        Use o link ou QR code que a barbearia compartilhou com você.
      </Text>
    </View>
  );
}

function TenantErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="font-display text-xl font-bold text-foreground">Barbearia indisponível</Text>
      <Pressable onPress={onRetry} className="rounded-lg bg-navy px-6 py-3 active:opacity-80">
        <Text className="font-semibold text-white">Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

function RootLayoutNav() {
  const { state } = useSession();
  const tenant = useTenant();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Lora_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem('onboarding_done');
      setOnboardingDone(done === 'true');
    })();
  }, []);

  // Ainda carregando fontes/onboarding/sessão
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

  // 2. Tenant ainda resolvendo
  if (tenant.status === 'loading') {
    return <View className="flex-1 bg-background"><StatusBar style="dark" /></View>;
  }

  // 3. Sem tenant — app aberto sem deep link/slug persistido
  if (tenant.status === 'no-tenant') {
    return <NoTenantScreen />;
  }

  // 4. Erro ao carregar tenant
  if (tenant.status === 'error') {
    return <TenantErrorScreen onRetry={tenant.retry} />;
  }

  // 5. Tenant pronto → app em abas, INDEPENDENTE de auth (guest-first)
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(public)/agendamento/[slug]" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <TenantProvider>
          <BookingProvider>
            <RootLayoutNav />
          </BookingProvider>
        </TenantProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
