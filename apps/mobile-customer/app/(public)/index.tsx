import { useRouter } from 'expo-router';
import { Scissors } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

/**
 * Tela inicial do app. Cliente chega aqui via deeplink (ignora essa
 * tela e abre direto na barbearia) ou abre o app sem link e busca
 * pelo slug.
 *
 * Sem marketplace nessa sprint — só search por slug (ADR-010 §2).
 */
export default function PublicHome() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  function handleSubmit() {
    const cleaned = slug.trim().toLowerCase();
    if (!cleaned) return;
    router.push(`/b/${encodeURIComponent(cleaned)}`);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center gap-3 pb-10">
          <Scissors size={48} color="#1a365d" strokeWidth={1.5} />
          <Text className="text-3xl font-bold text-slate-900">Barbearia</Text>
          <Text className="text-center text-base text-slate-500">
            Encontre sua barbearia favorita pelo nome único.
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-medium text-slate-700">
            Nome da barbearia
          </Text>
          <TextInput
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ex: barbearia-do-jaja"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            className="rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-slate-900"
          />
          <Pressable
            onPress={handleSubmit}
            className="mt-2 items-center justify-center rounded-md bg-slate-900 px-4 py-3 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              Continuar
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/login')}
          className="mt-8 items-center"
        >
          <Text className="text-sm text-slate-500 underline">
            Já é cliente? Entrar e ver histórico
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
