import type { MyAppointmentItem } from '@barbearia/schemas';
import { Check, Clock, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

/**
 * Pendentes (ADR-017 §5) — agendamentos pagos aguardando o barbeiro
 * confirmar/recusar. Ação rápida com botões. Recusar pede confirmação
 * (estorna o cliente).
 */
export default function PendentesScreen() {
  const { state } = useSession();
  const [items, setItems] = useState<MyAppointmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<MyAppointmentItem[]>('/me/appointments/pending');
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar pendentes');
    }
  }, []);

  useEffect(() => {
    if (state.status === 'linked') void refresh();
  }, [state.status, refresh]);

  if (state.status !== 'linked') return null;

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function confirm(id: string) {
    setActingId(id);
    try {
      await api.patch(`/me/appointments/${id}/confirm`);
      await refresh();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível confirmar.');
    } finally {
      setActingId(null);
    }
  }

  function askReject(item: MyAppointmentItem) {
    Alert.alert(
      'Recusar agendamento?',
      `${item.customerName} — ${item.service.name}\nO cliente será estornado.`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Recusar', style: 'destructive', onPress: () => void reject(item.id) },
      ],
    );
  }

  async function reject(id: string) {
    setActingId(id);
    try {
      await api.patch(`/me/appointments/${id}/reject`, {});
      await refresh();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível recusar.');
    } finally {
      setActingId(null);
    }
  }

  const count = items?.length ?? 0;

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Pendentes"
        title={count > 0 ? `${count} pra confirmar` : 'Tudo em dia'}
        avatarInitial={initialsOf(state.employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="p-6 pb-12 gap-3"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#357BE4" />
        }
      >
        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : items === null ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#357BE4" />
          </View>
        ) : items.length === 0 ? (
          <View className="items-center gap-2 py-16">
            <Check size={40} color="#727B8E" strokeWidth={1.5} />
            <Text className="text-base font-medium text-foreground">Nenhum pendente</Text>
            <Text className="text-center text-xs text-foreground-muted">
              Quando um cliente reservar e pagar, aparece aqui pra você confirmar.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <PendingCard
              key={item.id}
              item={item}
              busy={actingId === item.id}
              onConfirm={() => confirm(item.id)}
              onReject={() => askReject(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PendingCard({
  item,
  busy,
  onConfirm,
  onReject,
}: {
  item: MyAppointmentItem;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <View className="gap-3 rounded-lg border border-border bg-background p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{item.customerName}</Text>
          <Text className="text-xs text-foreground-muted">{item.service.name}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-foreground">{formatSlot(item.startAt)}</Text>
          <Text className="text-xs text-foreground-muted">{item.service.durationMin}min</Text>
        </View>
      </View>

      {item.confirmDeadline ? (
        <View className="flex-row items-center gap-1.5">
          <Clock size={13} color="#F27508" />
          <Text className="text-xs text-brand-orange">
            Confirme até {formatDeadline(item.confirmDeadline)}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={onReject}
          disabled={busy}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-border py-2.5 active:opacity-60 disabled:opacity-40"
        >
          <X size={16} color="#727B8E" />
          <Text className="text-sm font-medium text-foreground-muted">Recusar</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 active:opacity-80 disabled:opacity-40"
        >
          {busy ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Check size={16} color="white" />
              <Text className="text-sm font-bold text-white">Confirmar</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
