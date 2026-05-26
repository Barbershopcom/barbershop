import { Link, Redirect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

function roleLabel(role: 'admin' | 'barber' | 'admin_barber'): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'barber':
      return 'Barbeiro';
    case 'admin_barber':
      return 'Admin + Barbeiro';
  }
}

export default function InicioScreen() {
  const { state, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  // Estado errado → deixa index.tsx redirecionar.
  if (state.status === 'anonymous') return <Redirect href="/login" />;
  if (state.status === 'link-failed') return <Redirect href="/sem-vinculo" />;

  if (state.status === 'loading' || state.status === 'linking') {
    return (
      <View className="flex-1 items-center justify-center bg-background gap-3">
        <ActivityIndicator color="#357BE4" />
        <Text className="text-sm text-foreground-muted">Carregando seu perfil…</Text>
      </View>
    );
  }

  // state.status === 'linked'
  const { employee, barbershop, tenant } = state;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <ScrollView className="flex-1 bg-background-muted" contentContainerClassName="pb-12">
      {/* Header */}
      <View className="bg-background px-6 pb-6 pt-12">
        <Text className="text-xs uppercase tracking-wide text-foreground-muted">
          Página inicial
        </Text>
        <Text className="text-xl font-medium text-foreground">
          Bom ver você, {employee.displayName.split(' ')[0]}!
        </Text>
        <Text className="mt-1 text-xs text-foreground-muted">
          {tenant?.name ?? '—'} · {barbershop?.name ?? '—'} · {roleLabel(employee.role)}
        </Text>
      </View>

      {/* Cards placeholder — phases 2/3/4 substituem */}
      <View className="mt-3 gap-3 rounded-t-3xl bg-background p-6">
        <View className="rounded-lg border border-border bg-brand-orange-soft p-5">
          <Text className="text-base font-medium text-foreground">Sprint 2 em construção</Text>
          <Text className="mt-1 text-xs text-foreground-muted">
            Em breve: perfil, capabilities (quais serviços você faz) e sua agenda semanal.
          </Text>
        </View>

        <Link href="/perfil" asChild>
          <Pressable className="flex-row items-center justify-between rounded-lg border border-border bg-background p-5 active:opacity-70">
            <View>
              <Text className="text-sm font-semibold text-foreground-secondary">Meu perfil</Text>
              <Text className="mt-1 text-xs text-foreground-muted">
                Editar nome de exibição
              </Text>
            </View>
            <ChevronRight size={20} color="#727B8E" />
          </Pressable>
        </Link>

        <Link href="/servicos" asChild>
          <Pressable className="flex-row items-center justify-between rounded-lg border border-border bg-background p-5 active:opacity-70">
            <View>
              <Text className="text-sm font-semibold text-foreground-secondary">Meus serviços</Text>
              <Text className="mt-1 text-xs text-foreground-muted">
                Marcar quais serviços do catálogo você atende
              </Text>
            </View>
            <ChevronRight size={20} color="#727B8E" />
          </Pressable>
        </Link>

        <View className="rounded-lg border border-border bg-background p-5 opacity-50">
          <Text className="text-sm font-semibold text-foreground-secondary">Minha agenda</Text>
          <Text className="mt-1 text-xs text-foreground-muted">Phase 4</Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="mt-4 items-center justify-center rounded-md border border-border px-4 py-3 disabled:opacity-60"
        >
          {signingOut ? (
            <ActivityIndicator color="#727B8E" />
          ) : (
            <Text className="text-sm font-medium text-foreground-muted">Sair</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
