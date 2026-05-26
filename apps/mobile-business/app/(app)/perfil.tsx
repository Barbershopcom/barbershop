import { useEffect, useState } from 'react';
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

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

interface MeEmployeeResponse {
  employee: {
    id: string;
    displayName: string;
    email: string | null;
    role: 'admin' | 'barber' | 'admin_barber';
    isActive: boolean;
  };
  barbershop: { id: string; name: string } | null;
  tenant: { id: string; slug: string; name: string; timezone: string } | null;
  roles: string[];
}

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

export default function PerfilScreen() {
  const { state, refresh } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (state.status === 'linked') {
      setDisplayName(state.employee.displayName);
    }
  }, [state]);

  if (state.status !== 'linked') return null;

  const { employee, barbershop, tenant } = state;
  const dirty = displayName.trim() !== employee.displayName && displayName.trim().length >= 2;

  async function handleSave() {
    if (!dirty) return;
    setError(null);
    setSaving(true);
    try {
      await api.patch<MeEmployeeResponse>('/me/employee', {
        displayName: displayName.trim(),
      });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background-muted"
    >
      <Header
        caption="Perfil"
        title={employee.displayName}
        avatarInitial={initialsOf(employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="p-6 pb-12 gap-5"
      >
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground-secondary">
            Nome de exibição
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            editable={!saving}
            className="rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground"
          />
          <Text className="text-xs text-foreground-muted">
            Esse é o nome que clientes veem ao escolher seu barbeiro.
          </Text>
        </View>

        <View className="gap-2 rounded-lg border border-border bg-background-muted p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Gerenciado pelo admin
          </Text>
          <ReadOnlyRow label="Email" value={employee.email ?? '—'} />
          <ReadOnlyRow label="Papel" value={roleLabel(employee.role)} />
          <ReadOnlyRow label="Status" value={employee.isActive ? 'Ativo' : 'Inativo'} />
          <ReadOnlyRow label="Barbearia" value={tenant?.name ?? '—'} />
          <ReadOnlyRow label="Unidade" value={barbershop?.name ?? '—'} />
          <Text className="mt-1 text-xs text-foreground-muted">
            Pra mudar esses campos, fale com o admin da barbearia.
          </Text>
        </View>

        {error ? (
          <Text className="text-sm text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {savedFlash ? <Text className="text-sm text-success">Salvo!</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={!dirty || saving}
          className="mt-2 items-center justify-center rounded-lg bg-primary px-4 py-4 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Salvar alterações</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3 py-1">
      <Text className="text-sm text-foreground-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
