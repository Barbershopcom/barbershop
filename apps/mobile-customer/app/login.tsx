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

import { getSupabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center gap-4 px-6">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-slate-900">Entrar</Text>
          <Text className="text-sm text-slate-500">
            Para clientes — agende com seu barbeiro favorito.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700">Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            editable={!loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
          />
        </View>

        {error ? (
          <Text className="text-sm text-red-600" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="mt-2 items-center justify-center rounded-md bg-slate-900 px-4 py-3 disabled:opacity-60"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
