import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Seal } from '@/components/primitives/seal';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        scrollIndicatorInsets={{ right: 1 }}
      >
        {/* Logo + Marca */}
        <View
          className="mb-12 items-center gap-3 px-6"
          style={{ paddingTop: Math.max(insets.top, 12) + 24 }}
        >
          <Seal size={80} />
          <Text className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">
            NAVALHA
          </Text>
          <Text className="font-serif text-sm italic text-foreground-muted">
            seu corte, na hora certa
          </Text>
        </View>

        {/* Conteúdo */}
        <View className="px-6">
          {/* Seção de Login */}
          <View className="mb-8">
            <Text className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
              ENTRAR
            </Text>
            <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
              Faça login pra continuar
            </Text>
          </View>

          {/* Email */}
          <View className="mb-5 gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              EMAIL
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!loading}
              placeholder="cliente@email.com"
              placeholderTextColor="#8a8073"
              className="rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground"
            />
          </View>

          {/* Senha */}
          <View className="mb-3 gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              SENHA
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                editable={!loading}
                placeholder="••••••"
                placeholderTextColor="#8a8073"
                className="rounded-lg border border-border bg-card px-4 py-3 pr-12 text-base text-foreground"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff size={20} color="#8a8073" />
                ) : (
                  <Eye size={20} color="#8a8073" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Esqueci a senha */}
          <Pressable className="mb-6 items-end py-2">
            <Text className="text-xs font-semibold text-navy">Esqueci a senha →</Text>
          </Pressable>

          {/* Erro */}
          {error ? (
            <Text className="mb-4 text-sm text-destructive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {/* Botão Entrar */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="mb-6 items-center justify-center rounded-lg bg-navy py-4 active:opacity-80 disabled:opacity-60"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-display text-base font-bold text-white">Entrar</Text>
            )}
          </Pressable>

          {/* Divisor */}
          <View className="mb-6 flex-row items-center gap-3">
            <View className="flex-1 border-b border-border" />
            <Text className="text-xs text-foreground-muted">ou continue com</Text>
            <View className="flex-1 border-b border-border" />
          </View>

          {/* Google OAuth */}
          <Pressable
            onPress={() => void signInWithGoogle()}
            disabled={loading}
            className="mb-3 flex-row items-center justify-center gap-2 rounded-lg border border-border py-3 active:opacity-70 disabled:opacity-60"
          >
            <Text className="text-sm font-semibold text-foreground">Google</Text>
            <Text className="text-base font-semibold text-foreground">Continuar com Google</Text>
          </Pressable>

          {/* Apple OAuth */}
          <Pressable
            onPress={() => void signInWithApple()}
            disabled={loading}
            className="mb-6 flex-row items-center justify-center gap-2 rounded-lg bg-black py-3 active:opacity-70 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-white">🍎</Text>
            <Text className="text-base font-semibold text-white">Continuar com Apple</Text>
          </Pressable>

          {/* Criar conta */}
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-foreground-muted">Não tem conta?</Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-sm font-bold text-navy">Criar conta</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
