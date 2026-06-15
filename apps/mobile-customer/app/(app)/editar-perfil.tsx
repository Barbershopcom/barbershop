import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useSession } from '@/lib/session';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { state } = useSession();
  const [name, setName] = useState('João Silva');
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: Fazer PUT /me/profile
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    router.back();
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

      <ScrollView contentContainerClassName="px-6 py-6 pb-24">
        {/* Email (readonly) */}
        <View className="mb-4 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Email
          </Text>
          <TextInput
            value={state.status === 'authenticated' ? state.session?.user?.email : ''}
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
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleSave}
          disabled={loading}
          className={`items-center justify-center rounded-lg py-4 ${
            loading ? 'bg-foreground-muted/30' : 'bg-navy active:opacity-80'
          }`}
        >
          <Text className="font-display text-base font-bold text-white">
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
