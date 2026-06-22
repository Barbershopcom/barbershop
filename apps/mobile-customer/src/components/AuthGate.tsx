import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

export function AuthGate({ children, message }: { children: ReactNode; message: string }) {
  const { state } = useSession();
  const router = useRouter();
  if (state.status !== 'authenticated') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <Text className="text-center text-foreground-muted">{message}</Text>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="rounded-lg bg-navy px-6 py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">Entrar</Text>
        </Pressable>
      </View>
    );
  }
  return <>{children}</>;
}
