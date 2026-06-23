import type { MyCustomerAppointmentItem } from '@barbearia/schemas';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, Scissors, Star, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
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
  const [reviewing, setReviewing] = useState<MyCustomerAppointmentItem | null>(null);
  const [cancelling, setCancelling] = useState<MyCustomerAppointmentItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  // Abre o modal de confirmação (Alert.alert não funciona no Expo web).
  function confirmCancel(item: MyCustomerAppointmentItem) {
    setCancelError(null);
    setCancelling(item);
  }

  async function doCancel(id: string) {
    setBusyId(id);
    setCancelError(null);
    try {
      await api.post(`/me/customer-appointments/${id}/cancel`);
      setCancelling(null);
      await load(true);
    } catch (err) {
      // Mostra o erro no próprio modal (ex.: regra das 24h de antecedência).
      setCancelError(
        err instanceof ApiError ? err.message : 'Não foi possível cancelar.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft size={16} color="#8a8073" />
          <Text className="text-sm text-foreground-muted">Voltar</Text>
        </Pressable>
        <Pressable onPress={() => void signOut()}>
          <Text className="text-sm text-foreground-muted">Sair</Text>
        </Pressable>
      </View>

      <Text className="px-6 pb-3 text-2xl font-bold text-foreground">
        Meus agendamentos
      </Text>

      {/* Tabs Próximos / Histórico (ADR-018 §5) */}
      <View className="mb-2 flex-row gap-2 px-6">
        <Pressable
          onPress={() => setTab('upcoming')}
          className={`flex-1 items-center rounded-md py-2 ${
            tab === 'upcoming' ? 'bg-primary' : 'bg-background-muted'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'upcoming' ? 'text-white' : 'text-foreground-muted'
            }`}
          >
            Próximos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          className={`flex-1 items-center rounded-md py-2 ${
            tab === 'history' ? 'bg-primary' : 'bg-background-muted'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'history' ? 'text-white' : 'text-foreground-muted'
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
          <Text className="text-sm text-destructive">{state.message}</Text>
          <Pressable
            onPress={() => void load()}
            className="mt-2 rounded-md bg-primary px-4 py-2"
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
                <Calendar size={48} color="#8a8073" strokeWidth={1.5} />
                <Text className="text-center text-base text-foreground-muted">
                  {tab === 'upcoming'
                    ? 'Nenhum agendamento ativo.'
                    : 'Nada no histórico ainda.'}
                </Text>
                {tab === 'upcoming' ? (
                  <Pressable
                    onPress={() => router.replace('/')}
                    className="mt-4 rounded-md bg-primary px-4 py-2"
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
              ListHeaderComponent={
                tab === 'history' ? (
                  <View className="-mx-6">
                    <CutCounterBanner items={state.items} />
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              renderItem={({ item }) => (
                <AppointmentCard
                  item={item}
                  busy={busyId === item.id}
                  onCancel={() => confirmCancel(item)}
                  onReview={() => setReviewing(item)}
                />
              )}
            />
          );
        })()
      )}

      <ReviewModal
        item={reviewing}
        onClose={() => setReviewing(null)}
        onSubmitted={() => {
          setReviewing(null);
          void load(true);
        }}
      />

      <CancelModal
        item={cancelling}
        busy={cancelling ? busyId === cancelling.id : false}
        error={cancelError}
        onConfirm={() => {
          if (cancelling) void doCancel(cancelling.id);
        }}
        onClose={() => {
          setCancelling(null);
          setCancelError(null);
        }}
      />
    </View>
  );
}

/** Modal de confirmação de cancelamento (funciona web + nativo, ao contrário
 *  do Alert.alert). Mostra o erro inline — ex.: a regra das 24h. */
function CancelModal({
  item,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  item: MyCustomerAppointmentItem | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-md rounded-2xl bg-card p-6">
          <Text className="text-lg font-bold text-foreground">Cancelar agendamento?</Text>
          {item ? (
            <Text className="mt-2 text-sm text-foreground-muted">
              {item.service.name} com {item.barber.displayName}
              {'\n'}
              {formatSlotInTz(item.startAt, item.tenant.timezone)}
            </Text>
          ) : null}
          {error ? <Text className="mt-3 text-sm text-destructive">{error}</Text> : null}
          {item && item.cancellation.isLate && item.cancellation.feeCents > 0 ? (
            <Text className="mt-3 text-sm text-foreground">
              Cancelar com menos de 24h tem multa de{' '}
              {(item.cancellation.feeCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
              {'\n'}Você recebe{' '}
              {(item.cancellation.refundCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}de volta.
            </Text>
          ) : null}
          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="flex-1 items-center rounded-lg border border-border py-3 disabled:opacity-50"
            >
              <Text className="font-semibold text-foreground">Manter</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              className="flex-1 items-center rounded-lg bg-destructive py-3 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Cancelar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Conta cortes concluídos a partir da lista carregada (fonte canônica
 *  é Customer.completedCutsCount; pra o piloto contar localmente basta). */
function CutCounterBanner({ items }: { items: MyCustomerAppointmentItem[] }) {
  const count = items.filter((it) => it.status === 'completed').length;
  if (count === 0) return null;
  return (
    <View className="mx-6 mb-3 flex-row items-center gap-3 rounded-lg bg-primary px-4 py-3">
      <Scissors size={20} color="#fff" strokeWidth={1.5} />
      <Text className="text-sm font-semibold text-white">
        {count} {count === 1 ? 'corte concluído' : 'cortes concluídos'}
      </Text>
    </View>
  );
}

function AppointmentCard({
  item,
  busy,
  onCancel,
  onReview,
}: {
  item: MyCustomerAppointmentItem;
  busy: boolean;
  onCancel: () => void;
  onReview: () => void;
}) {
  // Cancelável enquanto ativo (ocupa slot): aguardando pgto / pendente / confirmado.
  const canCancel =
    item.status === 'awaiting_payment' ||
    item.status === 'pending' ||
    item.status === 'confirmed';
  // Avaliável: corte concluído ainda sem review (ADR-019 §1).
  const canReview = item.status === 'completed' && !item.hasReview;

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-widest text-foreground-muted">
            {item.tenant.name}
          </Text>
          <Text className="mt-1 text-base font-semibold text-foreground">
            {item.service.name}
          </Text>
          <Text className="mt-0.5 font-serif text-xs italic text-foreground-muted">
            com {item.barber.displayName}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Text className="mt-3 text-sm font-medium text-foreground">
        {formatSlotInTz(item.startAt, item.tenant.timezone)}
      </Text>

      {item.cancelReason ? (
        <Text className="mt-2 font-serif text-xs italic text-foreground-muted" numberOfLines={2}>
          Motivo: {item.cancelReason}
        </Text>
      ) : null}

      {canCancel ? (
        <Pressable
          onPress={onCancel}
          disabled={busy}
          className="mt-3 flex-row items-center justify-center gap-1.5 rounded-md border border-border py-2 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#8a8073" />
          ) : (
            <>
              <X size={14} color="#8a8073" />
              <Text className="text-sm font-medium text-foreground">
                Cancelar agendamento
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      {canReview ? (
        <Pressable
          onPress={onReview}
          className="mt-3 flex-row items-center justify-center gap-1.5 rounded-md bg-amber-500 py-2 active:opacity-80"
        >
          <Star size={14} color="#fff" fill="#fff" />
          <Text className="text-sm font-semibold text-white">Avaliar atendimento</Text>
        </Pressable>
      ) : item.status === 'completed' && item.hasReview ? (
        <View className="mt-3 flex-row items-center justify-center gap-1.5">
          <Star size={13} color="#f59e0b" fill="#f59e0b" />
          <Text className="text-xs font-medium text-foreground-muted">Você avaliou este corte</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Seletor de 1..5 estrelas. */
function StarRating({
  value,
  onChange,
  size = 36,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View className="flex-row justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Star
            size={size}
            color="#f59e0b"
            fill={n <= value ? '#f59e0b' : 'transparent'}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

/** Modal de avaliação (estrelas + comentário) de um corte concluído. */
function ReviewModal({
  item,
  onClose,
  onSubmitted,
}: {
  item: MyCustomerAppointmentItem | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reseta o form sempre que abre num appointment diferente.
  useEffect(() => {
    setRating(0);
    setComment('');
    setSubmitting(false);
  }, [item?.id]);

  async function submit() {
    if (!item || rating < 1) return;
    setSubmitting(true);
    try {
      await api.post('/me/reviews', {
        appointmentId: item.id,
        rating,
        comment: comment.trim() || undefined,
      });
      onSubmitted();
    } catch (err) {
      Alert.alert(
        'Erro',
        err instanceof ApiError ? err.message : 'Não foi possível enviar a avaliação.',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-card px-6 pb-10 pt-5">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Avaliar atendimento</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#8a8073" />
            </Pressable>
          </View>
          {item ? (
            <Text className="mb-5 text-sm text-foreground-muted">
              {item.service.name} com {item.barber.displayName} · {item.tenant.name}
            </Text>
          ) : null}

          <StarRating value={rating} onChange={setRating} />

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Conte como foi (opcional)"
            placeholderTextColor="#8a8073"
            multiline
            maxLength={1000}
            className="mt-5 min-h-20 rounded-lg border border-border px-3 py-3 text-sm text-foreground"
            style={{ textAlignVertical: 'top' }}
          />

          <Pressable
            onPress={submit}
            disabled={rating < 1 || submitting}
            className="mt-5 items-center justify-center rounded-lg bg-primary py-3.5 disabled:opacity-40"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">Enviar avaliação</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

