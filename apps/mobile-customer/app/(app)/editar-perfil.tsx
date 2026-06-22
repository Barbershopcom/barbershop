import type { MyCustomerProfile } from '@barbearia/schemas';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { formatPhoneBR, toE164 } from '@/lib/format';
import { useQuery } from '@/lib/use-query';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useQuery<MyCustomerProfile>({
    queryFn: () => api.get<MyCustomerProfile>('/me/customer'),
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill quando o perfil chega (sem mock).
  useEffect(() => {
    if (profile) {
      setName(profile.displayName ?? '');
      setPhone(formatPhoneBR(profile.phoneE164));
    }
  }, [profile]);

  const handleSave = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Nome precisa ter ao menos 2 caracteres.');
      return;
    }

    const body: { displayName: string; phoneE164?: string } = { displayName: trimmedName };
    const phoneInput = phone.trim();
    if (phoneInput) {
      const e164 = toE164(phoneInput);
      if (!e164) {
        setError('Telefone inválido. Use DDD + número, ex: (11) 99999-9999.');
        return;
      }
      body.phoneE164 = e164;
    }

    setSaving(true);
    try {
      await api.patch('/me/customer', body);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">EDITAR PERFIL</Text>
          <View className="w-10" />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a365d" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-6 py-6 pb-24">
          {/* Email (readonly) */}
          <View className="mb-4 gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Email
            </Text>
            <TextInput
              value={profile?.email ?? ''}
              editable={false}
              className="rounded-lg bg-foreground-muted/10 px-4 py-3 text-foreground opacity-50"
            />
            <Text className="text-xs text-foreground-muted">Não pode ser alterado</Text>
          </View>

          {/* Nome */}
          <View className="mb-4 gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Nome
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome completo"
              placeholderTextColor="#8a8073"
              className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
            />
          </View>

          {/* Telefone */}
          <View className="mb-6 gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Telefone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 98765-4321"
              placeholderTextColor="#8a8073"
              keyboardType="phone-pad"
              className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
            />
          </View>

          {error ? (
            <Text className="text-sm text-destructive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </ScrollView>
      )}

      {/* Footer */}
      <View className="border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleSave}
          disabled={saving || isLoading}
          className={`items-center justify-center rounded-lg py-4 ${
            saving || isLoading ? 'bg-foreground-muted/30' : 'bg-navy active:opacity-80'
          }`}
        >
          <Text className="font-display text-base font-bold text-white">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
