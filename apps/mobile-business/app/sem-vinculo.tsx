import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

export default function SemVinculoScreen() {
  const { state, retryLink, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  if (state.status !== 'link-failed') {
    // Estado mudou (linked ou anonymous) — index.tsx redireciona.
    return null;
  }

  async function handleRetry() {
    setBusy(true);
    await retryLink();
    setBusy(false);
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setBusy(false);
  }

  return (
    <View className="flex-1 justify-center gap-6 bg-background px-6">
      <View className="gap-2">
        <Text className="text-xl font-medium text-foreground">Sem vínculo encontrado</Text>
        <Text className="text-sm text-foreground-muted">
          Você está logado como{' '}
          <Text className="font-semibold text-foreground">
            {state.session.user.email ?? '(sem email)'}
          </Text>
          , mas nenhuma barbearia te cadastrou com esse email ainda.
        </Text>
      </View>

      <View className="gap-2 rounded-md border border-border bg-background-muted p-4">
        <Text className="text-sm font-semibold text-foreground-secondary">Próximos passos</Text>
        <Text className="text-sm text-foreground-muted">
          1. Confira com o admin da barbearia se ele te cadastrou com o email exato:{' '}
          {state.session.user.email}
        </Text>
        <Text className="text-sm text-foreground-muted">
          2. Quando ele confirmar, toque em &quot;Tentar de novo&quot; abaixo.
        </Text>
      </View>

      <Text className="text-xs text-destructive">{state.message}</Text>

      <View className="gap-2">
        <Pressable
          onPress={handleRetry}
          disabled={busy}
          className="items-center justify-center rounded-md bg-primary px-4 py-3 disabled:opacity-60"
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Tentar de novo</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleSignOut}
          disabled={busy}
          className="items-center justify-center rounded-md border border-border px-4 py-3 disabled:opacity-60"
        >
          <Text className="text-base font-medium text-foreground-secondary">Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}
