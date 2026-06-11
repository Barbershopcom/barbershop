import { Redirect, useRouter } from 'expo-router';
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

export default function LoginScreen() {
  const { state, signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === 'linked') {
    return <Redirect href="/inicio" />;
  }
  if (state.status === 'link-failed') {
    return <Redirect href="/sem-vinculo" />;
  }
  // 'linking' permanece aqui mostrando o form desabilitado/spinner via submitting;
  // mandar pra /inicio durante linking causa loop com (app)/_layout que exige 'linked'.

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Falha no login');
      return;
    }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center gap-10 px-6">
        {/* Logo + headline */}
        <View className="items-center gap-5">
          <View className="h-12 w-12 items-center justify-center rounded-md bg-brand-orange">
            <View className="h-5 w-5 rounded-sm bg-white opacity-90" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-lg font-medium text-foreground">Acesse sua conta</Text>
            <Text className="text-xs text-foreground-muted">App do barbeiro / admin</Text>
          </View>
        </View>

        {/* Form */}
        <View className="gap-5">
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground-secondary">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!submitting}
              placeholder="exemple@gmail.com"
              placeholderTextColor="#8a8073"
              className="rounded-md border border-border bg-background px-4 py-3 text-base text-foreground"
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground-secondary">Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              editable={!submitting}
              placeholder="••••••••"
              placeholderTextColor="#8a8073"
              className="rounded-md border border-border bg-background px-4 py-3 text-base text-foreground"
            />
          </View>

          {error ? (
            <Text className="text-sm text-destructive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            className="mt-2 items-center justify-center rounded-lg bg-primary px-4 py-4 disabled:opacity-60"
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">Login</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
