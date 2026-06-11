import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '@/lib/session';

/**
 * Login opcional do cliente. ADR-010 §1: guest-first — login só
 * desbloqueia histórico e cancel in-app. Cliente sem conta usa o
 * resto do app normalmente.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Erro ao entrar.');
      return;
    }
    router.replace('/meus-agendamentos');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center gap-4 px-6">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-foreground">Entrar</Text>
          <Text className="text-sm text-foreground-muted">
            Acompanhe seus agendamentos e cancele com 1 toque.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            className="rounded-md border border-border bg-card px-3 py-2 text-base text-foreground"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            editable={!loading}
            className="rounded-md border border-border bg-card px-3 py-2 text-base text-foreground"
          />
        </View>

        {error ? (
          <Text className="text-sm text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="mt-2 items-center justify-center rounded-md bg-primary px-4 py-3 disabled:opacity-60"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">Entrar</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} className="mt-2 items-center">
          <Text className="text-sm text-foreground-muted">Voltar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
