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

import { Seal } from '@/components/primitives/seal';
import { useSession } from '@/lib/session';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithApple } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Email é obrigatório.');
      return;
    }
    if (password.length < 6) {
      setError('Senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Erro ao criar conta.');
      return;
    }
    router.replace('/(auth)/login');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerClassName="justify-center px-6 py-12">
        {/* Logo + Marca */}
        <View className="mb-8 items-center gap-2">
          <Seal size={64} />
          <Text className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
            NAVALHA
          </Text>
          <Text className="font-serif text-sm italic text-foreground-muted">seu corte, na hora certa</Text>
        </View>

        {/* Seção de Signup */}
        <View className="mb-6">
          <Text className="mb-1 font-display text-2xl uppercase tracking-wide text-foreground">CRIAR CONTA</Text>
          <Text className="font-serif text-sm italic text-foreground-muted">
            Comece a gerenciar seu trabalho
          </Text>
        </View>

        {/* Email */}
        <View className="mb-4 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            placeholder="barbeiro@email.com"
            placeholderTextColor="#8a8073"
            className="rounded-md border border-border bg-card px-4 py-3 text-base text-foreground"
          />
        </View>

        {/* Senha */}
        <View className="mb-4 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Senha</Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholder="Pelo menos 6 caracteres"
              placeholderTextColor="#8a8073"
              className="rounded-md border border-border bg-card px-4 py-3 pr-12 text-base text-foreground"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff size={18} color="#8a8073" />
              ) : (
                <Eye size={18} color="#8a8073" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Confirmar Senha */}
        <View className="mb-4 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Confirmar Senha
          </Text>
          <View className="relative">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              editable={!loading}
              placeholder="Repita a senha"
              placeholderTextColor="#8a8073"
              className="rounded-md border border-border bg-card px-4 py-3 pr-12 text-base text-foreground"
            />
            <Pressable
              onPress={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showConfirm ? (
                <EyeOff size={18} color="#8a8073" />
              ) : (
                <Eye size={18} color="#8a8073" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Erro */}
        {error ? (
          <Text className="mb-4 text-sm text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {/* Botão Criar Conta */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="mb-3 items-center justify-center rounded-md bg-navy px-4 py-4 disabled:opacity-60"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-display text-base font-bold text-white">Criar Conta</Text>
          )}
        </Pressable>

        {/* Divisor */}
        <View className="mb-3 flex-row items-center gap-3">
          <View className="flex-1 border-b border-border" />
          <Text className="text-xs text-foreground-muted">ou continue com</Text>
          <View className="flex-1 border-b border-border" />
        </View>

        {/* Google OAuth */}
        <Pressable
          onPress={() => void signInWithGoogle()}
          disabled={loading}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-md border border-border py-3 active:opacity-70 disabled:opacity-60"
        >
          <Text className="text-base font-semibold text-foreground">🔵 Continuar com Google</Text>
        </Pressable>

        {/* Apple OAuth (TODO: requer setup adicional em produção) */}
        <Pressable
          onPress={() => void signInWithApple()}
          disabled={loading}
          className="mb-6 flex-row items-center justify-center gap-2 rounded-md border border-border bg-black py-3 active:opacity-70 disabled:opacity-60"
        >
          <Text className="text-base font-semibold text-white">🍎 Continuar com Apple</Text>
        </Pressable>

        {/* Já tem conta */}
        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-sm text-foreground-muted">Já tem conta?</Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text className="text-sm font-bold text-navy">Entrar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
