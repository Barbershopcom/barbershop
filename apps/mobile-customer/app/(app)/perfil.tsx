import { useRouter } from 'expo-router';
import { ArrowLeft, Edit, LogOut } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

export default function PerfilScreen() {
  const router = useRouter();
  const { state, signOut } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const email =
    state.status === 'authenticated' ? state.session?.user?.email : 'usuario@email.com';

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

      <ScrollView contentContainerClassName="px-6 py-6">
        {/* Avatar */}
        <View className="mb-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-navy">
            <Text className="text-2xl font-bold text-white">
              {email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="mt-4 text-center font-display text-xl font-bold text-foreground">
            {email?.split('@')[0]}
          </Text>
          <Text className="text-sm text-foreground-muted">{email}</Text>
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
              <Text className="text-xs text-foreground-muted">Nome, email, telefone</Text>
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
    </View>
  );
}
