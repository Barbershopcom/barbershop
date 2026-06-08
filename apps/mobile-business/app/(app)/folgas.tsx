import type { CreateMyTimeOffResponse, MyTimeOffDto } from '@barbearia/schemas';
import { CalendarOff, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Constrói ISO UTC a partir de data (YYYY-MM-DD) + hora (HH:MM) locais. */
function toIso(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [hh, mm] = time.split(':');
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    0,
    0,
  ).toISOString();
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)} ${timeFmt.format(start)} → ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function FolgasScreen() {
  const { state } = useSession();
  const [items, setItems] = useState<MyTimeOffDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // form
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await api.get<MyTimeOffDto[]>('/me/time-off');
      setItems(rows);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar folgas');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state.status !== 'linked') return null;

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function create() {
    setFormError(null);
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      setFormError('Use datas no formato AAAA-MM-DD.');
      return;
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      setFormError('Use horários no formato HH:MM.');
      return;
    }
    const startIso = toIso(startDate, startTime);
    const endIso = toIso(endDate, endTime);
    if (new Date(startIso) >= new Date(endIso)) {
      setFormError('O fim deve ser depois do início.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post<CreateMyTimeOffResponse>('/me/time-off', {
        startAt: startIso,
        endAt: endIso,
        reason: reason.trim() || undefined,
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      const n = res.cancelledAppointmentsCount;
      if (n > 0) {
        Alert.alert(
          'Folga criada',
          `${n} agendamento${n === 1 ? '' : 's'} no período ${n === 1 ? 'foi cancelado' : 'foram cancelados'} e ${n === 1 ? 'o cliente foi avisado' : 'os clientes foram avisados'}.`,
        );
      }
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível criar a folga.');
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(item: MyTimeOffDto) {
    Alert.alert('Remover folga?', formatRange(item.startAt, item.endAt), [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          api
            .delete(`/me/time-off/${item.id}`)
            .then(() => refresh())
            .catch((err) =>
              Alert.alert(
                'Erro',
                err instanceof ApiError ? err.message : 'Não foi possível remover.',
              ),
            );
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Folgas"
        title="Minhas folgas"
        avatarInitial={initialsOf(state.employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="px-6 py-6 pb-32 gap-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#357BE4" />
        }
      >
        <Text className="text-xs text-foreground-muted">
          Marque períodos em que você não vai atender. Agendamentos ativos no período são
          cancelados automaticamente e os clientes avisados.
        </Text>

        {/* Form de nova folga */}
        <View className="gap-3 rounded-lg border border-border bg-background-muted p-4">
          <Text className="text-sm font-semibold text-foreground">Nova folga</Text>

          <View className="gap-1">
            <Text className="text-xs text-foreground-muted">Início</Text>
            <View className="flex-row gap-2">
              <DateField value={startDate} onChange={setStartDate} disabled={saving} />
              <TimeField value={startTime} onChange={setStartTime} disabled={saving} />
            </View>
          </View>

          <View className="gap-1">
            <Text className="text-xs text-foreground-muted">Fim</Text>
            <View className="flex-row gap-2">
              <DateField value={endDate} onChange={setEndDate} disabled={saving} />
              <TimeField value={endTime} onChange={setEndTime} disabled={saving} />
            </View>
          </View>

          <View className="gap-1">
            <Text className="text-xs text-foreground-muted">Motivo (opcional)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Ex: consulta médica"
              placeholderTextColor="#727B8E"
              editable={!saving}
              maxLength={500}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </View>

          {formError ? (
            <Text className="text-sm text-destructive" accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={create}
            disabled={saving}
            className="mt-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-40"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Plus size={16} color="white" />
                <Text className="text-base font-bold text-white">Criar folga</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Lista de folgas futuras */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Próximas folgas
          </Text>
          {loadError ? (
            <Text className="text-sm text-destructive">{loadError}</Text>
          ) : items === null ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#357BE4" />
            </View>
          ) : items.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <CalendarOff size={28} color="#727B8E" strokeWidth={1.5} />
              <Text className="text-sm text-foreground-muted">Nenhuma folga marcada.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center gap-3 rounded-lg border border-border bg-background p-4"
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {formatRange(item.startAt, item.endAt)}
                  </Text>
                  {item.reason ? (
                    <Text className="mt-0.5 text-xs text-foreground-muted">{item.reason}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => confirmRemove(item)}
                  className="h-9 w-9 items-center justify-center rounded-md active:opacity-60"
                  accessibilityLabel="Remover folga"
                >
                  <Trash2 size={16} color="#727B8E" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DateField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9-]/g, ''))}
      placeholder="AAAA-MM-DD"
      placeholderTextColor="#727B8E"
      editable={!disabled}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
    />
  );
}

function TimeField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(v) => {
        const cleaned = v.replace(/[^0-9:]/g, '');
        if (cleaned.length === 4 && !cleaned.includes(':')) {
          onChange(`${cleaned.slice(0, 2)}:${cleaned.slice(2)}`);
        } else {
          onChange(cleaned);
        }
      }}
      placeholder="HH:MM"
      placeholderTextColor="#727B8E"
      editable={!disabled}
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
      maxLength={5}
      className="w-20 rounded-md border border-border bg-background px-2 py-2 text-center text-sm text-foreground"
    />
  );
}
