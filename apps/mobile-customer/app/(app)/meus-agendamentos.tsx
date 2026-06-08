import type { MyCustomerAppointmentItem } from '@barbearia/schemas';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { formatSlotInTz } from '@/lib/format';
import { useSession } from '@/lib/session';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: MyCustomerAppointmentItem[] }
  | { kind: 'error'; message: string };

const ACTIVE_STATUSES: ReadonlySet<MyCustomerAppointmentItem['status']> = new Set([
  'awaiting_payment',
  'pending',
  'confirmed',
]);

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');

  const load = useCallback(async (silent = false) => {
    if (!silent) setState({ kind: 'loading' });
    try {
      const items = await api.get<MyCustomerAppointmentItem[]>(
        '/me/customer-appointments',
      );
      setState({ kind: 'ready', items });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Erro ao carregar.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  function confirmCancel(item: MyCustomerAppointmentItem) {
    Alert.alert(
      'Cancelar agendamento?',
      `${item.service.name} em ${item.tenant.name}\n${formatSlotInTz(item.startAt, item.tenant.timezone)}`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => void doCancel(item.id),
        },
      ],
    );
  }

  async function doCancel(id: string) {
    setBusyId(id);
    try {
      await api.post(`/me/customer-appointments/${id}/cancel`);
      await load(true);
    } catch (err) {
      Alert.alert(
        'Erro',
        err instanceof ApiError ? err.message : 'Não foi possível cancelar.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft size={16} color="#64748b" />
          <Text className="text-sm text-slate-500">Voltar</Text>
        </Pressable>
        <Pressable onPress={() => void signOut()}>
          <Text className="text-sm text-slate-500">Sair</Text>
        </Pressable>
      </View>

      <Text className="px-6 pb-3 text-2xl font-bold text-slate-900">
        Meus agendamentos
      </Text>

      {/* Tabs Próximos / Histórico (ADR-018 §5) */}
      <View className="mb-2 flex-row gap-2 px-6">
        <Pressable
          onPress={() => setTab('upcoming')}
          className={`flex-1 items-center rounded-md py-2 ${
            tab === 'upcoming' ? 'bg-slate-900' : 'bg-slate-100'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'upcoming' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Próximos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          className={`flex-1 items-center rounded-md py-2 ${
            tab === 'history' ? 'bg-slate-900' : 'bg-slate-100'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'history' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Histórico
          </Text>
        </Pressable>
      </View>

      {state.kind === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a365d" />
        </View>
      ) : state.kind === 'error' ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-sm text-red-600">{state.message}</Text>
          <Pressable
            onPress={() => void load()}
            className="mt-2 rounded-md bg-slate-900 px-4 py-2"
          >
            <Text className="text-sm font-semibold text-white">Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        (() => {
          const filtered = state.items
            .filter((it) =>
              tab === 'upcoming'
                ? ACTIVE_STATUSES.has(it.status)
                : !ACTIVE_STATUSES.has(it.status),
            )
            .sort((a, b) =>
              tab === 'upcoming'
                ? a.startAt.localeCompare(b.startAt) // próximos: crescente
                : b.startAt.localeCompare(a.startAt), // histórico: recente primeiro
            );

          if (filtered.length === 0) {
            return (
              <View className="flex-1 items-center justify-center gap-3 px-6">
                <Calendar size={48} color="#cbd5e1" strokeWidth={1.5} />
                <Text className="text-center text-base text-slate-500">
                  {tab === 'upcoming'
                    ? 'Nenhum agendamento ativo.'
                    : 'Nada no histórico ainda.'}
                </Text>
                {tab === 'upcoming' ? (
                  <Pressable
                    onPress={() => router.replace('/')}
                    className="mt-4 rounded-md bg-slate-900 px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Encontrar uma barbearia
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }

          return (
            <FlatList
              data={filtered}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
              ItemSeparatorComponent={() => <View className="h-3" />}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              renderItem={({ item }) => (
                <AppointmentCard
                  item={item}
                  busy={busyId === item.id}
                  onCancel={() => confirmCancel(item)}
                />
              )}
            />
          );
        })()
      )}
    </View>
  );
}

function AppointmentCard({
  item,
  busy,
  onCancel,
}: {
  item: MyCustomerAppointmentItem;
  busy: boolean;
  onCancel: () => void;
}) {
  const statusBg = statusBgColor(item.status);
  const statusText = statusLabel(item.status);
  // Cancelável enquanto ativo (ocupa slot): aguardando pgto / pendente / confirmado.
  const canCancel =
    item.status === 'awaiting_payment' ||
    item.status === 'pending' ||
    item.status === 'confirmed';

  return (
    <View className="rounded-lg border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-widest text-slate-400">
            {item.tenant.name}
          </Text>
          <Text className="mt-1 text-base font-semibold text-slate-900">
            {item.service.name}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            com {item.barber.displayName}
          </Text>
        </View>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusBg }}>
          <Text className="text-[10px] font-bold uppercase text-white">
            {statusText}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm font-medium text-slate-900">
        {formatSlotInTz(item.startAt, item.tenant.timezone)}
      </Text>

      {item.cancelReason ? (
        <Text className="mt-2 text-xs italic text-slate-500" numberOfLines={2}>
          Motivo: {item.cancelReason}
        </Text>
      ) : null}

      {canCancel ? (
        <Pressable
          onPress={onCancel}
          disabled={busy}
          className="mt-3 flex-row items-center justify-center gap-1.5 rounded-md border border-slate-300 py-2 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <>
              <X size={14} color="#475569" />
              <Text className="text-sm font-medium text-slate-700">
                Cancelar agendamento
              </Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function statusBgColor(status: MyCustomerAppointmentItem['status']): string {
  switch (status) {
    case 'awaiting_payment':
      return '#d97706'; // âmbar escuro — falta pagar
    case 'pending':
      return '#f59e0b'; // amarelo — aguardando barbeiro
    case 'confirmed':
      return '#1a365d'; // navy — confirmado
    case 'completed':
      return '#10b981'; // verde
    case 'cancelled':
      return '#94a3b8'; // cinza
    case 'expired':
      return '#bf212f'; // vermelho
    case 'no_show':
      return '#d97706'; // âmbar
  }
}

function statusLabel(status: MyCustomerAppointmentItem['status']): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Aguardando pagamento';
    case 'pending':
      return 'Aguardando confirmação';
    case 'confirmed':
      return 'Confirmado';
    case 'completed':
      return 'Concluído';
    case 'cancelled':
      return 'Cancelado';
    case 'expired':
      return 'Expirado';
    case 'no_show':
      return 'Faltou';
  }
}
