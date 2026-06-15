import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text } from 'react-native';

import { Seal } from '@/components/primitives/seal';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center gap-4">
        <Seal size={80} />
        <Text className="font-display text-3xl font-bold uppercase text-navy">NAVALHA</Text>
        <Text className="font-serif text-sm italic text-foreground-muted">seu corte, na hora certa</Text>
      </View>
    </View>
  );
}
