import type { MyServiceItem } from '@barbearia/schemas';
import { Redirect, useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function ServicosScreen() {
  const { state } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<MyServiceItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  /** Set local de IDs marcados — espelha items mas é o source of truth pro form. */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoadError(null);
    try {
      const data = await api.get<MyServiceItem[]>('/me/services');
      setItems(data);
      setSelected(new Set(data.filter((i) => i.mine).map((i) => i.service.id)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar serviços');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (state.status !== 'linked') {
    return <Redirect href="/" />;
  }

  function toggle(serviceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
    setSaveError(null);
  }

  // Detecta alterações vs estado servidor
  const originalSet = new Set(items?.filter((i) => i.mine).map((i) => i.service.id) ?? []);
  const dirty =
    selected.size !== originalSet.size ||
    [...selected].some((id) => !originalSet.has(id));

  async function save() {
    if (!dirty) return;
    setSaveError(null);
    setSaving(true);
    try {
      const data = await api.put<MyServiceItem[]>('/me/services', {
        serviceIds: [...selected],
      });
      setItems(data);
      setSelected(new Set(data.filter((i) => i.mine).map((i) => i.service.id)));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-background-muted">
      <View className="bg-background px-6 pb-6 pt-12">
        <Pressable
          onPress={() => router.back()}
          className="mb-3 flex-row items-center gap-1 self-start"
        >
          <ChevronLeft size={18} color="#727B8E" />
          <Text className="text-sm text-foreground-muted">Voltar</Text>
        </Pressable>
        <Text className="text-xl font-medium text-foreground">Meus serviços</Text>
        <Text className="mt-1 text-xs text-foreground-muted">
          Marque os serviços do catálogo da barbearia que você atende. Clientes só te veem como
          opção pra serviços marcados.
        </Text>
      </View>

      <ScrollView
        className="mt-3 flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="px-6 py-6 pb-32"
      >
        {loadError ? (
          <Text className="text-sm text-destructive">{loadError}</Text>
        ) : items === null ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#357BE4" />
          </View>
        ) : items.length === 0 ? (
          <View className="rounded-lg border border-border bg-background-muted p-6">
            <Text className="text-sm text-foreground-muted">
              Nenhum serviço cadastrado no catálogo ainda. Peça pro admin cadastrar serviços no
              painel admin (web).
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {items.map(({ service }) => {
              const checked = selected.has(service.id);
              return (
                <Pressable
                  key={service.id}
                  onPress={() => toggle(service.id)}
                  className={`flex-row items-start gap-3 rounded-lg border p-4 ${
                    checked ? 'border-primary bg-brand-orange-soft' : 'border-border bg-background'
                  }`}
                >
                  <View
                    className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
                      checked ? 'border-primary bg-primary' : 'border-border bg-background'
                    }`}
                  >
                    {checked ? <Check size={14} color="white" strokeWidth={3} /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">{service.name}</Text>
                    {service.description ? (
                      <Text className="mt-0.5 text-xs text-foreground-muted">
                        {service.description}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-foreground-muted">
                      {duration(service.durationMin)} · {brl(service.basePriceCents)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {saveError ? (
          <Text className="mt-3 text-sm text-destructive" accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}
        {savedFlash ? <Text className="mt-3 text-sm text-success">Salvo!</Text> : null}
      </ScrollView>

      {/* Save fixo no rodapé */}
      <View className="border-t border-border bg-background px-6 pb-8 pt-4">
        <Text className="mb-2 text-xs text-foreground-muted">
          {selected.size} de {items?.length ?? 0} marcados
        </Text>
        <Pressable
          onPress={save}
          disabled={!dirty || saving}
          className="items-center justify-center rounded-md bg-primary px-4 py-3 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">
              {dirty ? 'Salvar alterações' : 'Sem alterações'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
