import type { MyCustomerProfile } from '@barbearia/schemas';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Edit, LogOut } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { formatPhoneBR } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';

export default function PerfilScreen() {
  const router = useRouter();
  const { signOut } = useSession();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<MyCustomerProfile>({
    queryFn: () => api.get<MyCustomerProfile>('/me/customer'),
  });

  // Reflete edições ao voltar da tela de editar.
  useFocusEffect(
    useCallback(() => {
      void refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const name = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Cliente';
  const initial = (profile?.displayName?.trim() || profile?.email || '?').charAt(0).toUpperCase();
  const cuts = profile?.completedCutsCount ?? 0;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">PERFIL</Text>
          <View className="w-10" />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a365d" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-foreground-muted">
            Não foi possível carregar seu perfil.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            className="rounded-lg bg-navy px-6 py-3 active:opacity-80"
          >
            <Text className="font-semibold text-white">Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-6 py-6">
          {/* Avatar */}
          <View className="mb-6 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-navy">
              <Text className="text-2xl font-bold text-white">{initial}</Text>
            </View>
            <Text className="mt-4 text-center font-display text-xl font-bold text-foreground">
              {name}
            </Text>
            {profile?.email ? (
              <Text className="text-sm text-foreground-muted">{profile.email}</Text>
            ) : null}
            {profile?.phoneE164 ? (
              <Text className="text-sm text-foreground-muted">
                {formatPhoneBR(profile.phoneE164)}
              </Text>
            ) : null}
          </View>

          {/* Stat: cortes concluídos */}
          <View className="mb-6 items-center rounded-lg border border-border bg-card py-4">
            <Text className="font-display text-3xl font-bold text-navy">{cuts}</Text>
            <Text className="text-xs uppercase tracking-wide text-foreground-muted">
              {cuts === 1 ? 'corte concluído' : 'cortes concluídos'}
            </Text>
          </View>

          {/* Opções */}
          <View className="gap-3">
            <Pressable
              onPress={() => router.push('/(app)/editar-perfil')}
              className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 active:bg-blue-50"
            >
              <Edit size={20} color="#1a365d" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Editar Perfil</Text>
                <Text className="text-xs text-foreground-muted">Nome e telefone</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(app)/notificacoes')}
              className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 active:bg-blue-50"
            >
              <Text className="text-xl">🔔</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Notificações</Text>
                <Text className="text-xs text-foreground-muted">Gerenciar preferências</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(app)/promocoes')}
              className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 active:bg-blue-50"
            >
              <Text className="text-xl">🎁</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Promoções</Text>
                <Text className="text-xs text-foreground-muted">Ofertas e descontos</Text>
              </View>
            </Pressable>
          </View>

          {/* Sair */}
          <Pressable
            onPress={handleLogout}
            className="mt-8 flex-row items-center justify-center gap-2 rounded-lg bg-destructive py-4 active:opacity-80"
          >
            <LogOut size={20} color="white" />
            <Text className="font-semibold text-white">Sair</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
