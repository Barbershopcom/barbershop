import {
  type HourRange,
  type MyScheduleItem,
  type Weekday,
  weekdayLabels,
  weekdays,
} from '@barbearia/schemas';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

interface DayState {
  weekday: Weekday;
  ranges: { opensAt: string; closesAt: string }[];
}

function emptyWeek(): DayState[] {
  return weekdays.map((w) => ({ weekday: w, ranges: [] }));
}

function groupByDay(rows: MyScheduleItem[]): DayState[] {
  const map = new Map<Weekday, DayState>();
  for (const w of weekdays) map.set(w, { weekday: w, ranges: [] });
  for (const r of rows) {
    const slot = map.get(r.weekday);
    if (slot) slot.ranges.push({ opensAt: r.opensAt, closesAt: r.closesAt });
  }
  return Array.from(map.values()).map((d) => ({
    ...d,
    ranges: d.ranges.sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
  }));
}

function TimeInput({
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

export default function AgendaScreen() {
  const { state } = useSession();
  const [week, setWeek] = useState<DayState[]>(emptyWeek());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function refresh() {
    setLoadError(null);
    try {
      const rows = await api.get<MyScheduleItem[]>('/me/schedule');
      setWeek(groupByDay(rows));
      setLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar agenda');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (state.status !== 'linked') return null;

  function addRange(weekday: Weekday) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, ranges: [...d.ranges, { opensAt: '09:00', closesAt: '18:00' }] }
          : d,
      ),
    );
    setSaveError(null);
  }

  function removeRange(weekday: Weekday, idx: number) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday ? { ...d, ranges: d.ranges.filter((_, i) => i !== idx) } : d,
      ),
    );
    setSaveError(null);
  }

  function updateRange(
    weekday: Weekday,
    idx: number,
    field: 'opensAt' | 'closesAt',
    value: string,
  ) {
    setWeek((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? {
              ...d,
              ranges: d.ranges.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
            }
          : d,
      ),
    );
    setSaveError(null);
  }

  async function save() {
    setSaveError(null);
    setSaving(true);
    try {
      const ranges: HourRange[] = week.flatMap((d) =>
        d.ranges.map((r) => ({
          weekday: d.weekday,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
        })),
      );
      for (const r of ranges) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.opensAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.closesAt)) {
          throw new Error(
            `${weekdayLabels[r.weekday as Weekday]}: horário inválido (use HH:MM, ex: 09:00).`,
          );
        }
        if (r.closesAt <= r.opensAt) {
          throw new Error(
            `${weekdayLabels[r.weekday as Weekday]}: fim (${r.closesAt}) deve ser depois do início (${r.opensAt}).`,
          );
        }
      }
      await api.put<MyScheduleItem[]>('/me/schedule', { ranges });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Agenda"
        title="Minha semana"
        avatarInitial={initialsOf(state.employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="px-6 py-6 pb-32 gap-3"
      >
        <Text className="text-xs text-foreground-muted">
          Defina quando você atende em cada dia. Dias sem faixa = não trabalha. Múltiplas faixas
          por dia (ex: manhã 9-12, tarde 14-19).
        </Text>

        {loadError ? (
          <Text className="text-sm text-destructive">{loadError}</Text>
        ) : !loaded ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#357BE4" />
          </View>
        ) : (
          <View className="gap-3">
            {week.map((day) => (
              <View
                key={day.weekday}
                className="rounded-lg border border-border bg-background p-4"
              >
                <Text className="mb-2 text-sm font-semibold text-foreground">
                  {weekdayLabels[day.weekday]}
                </Text>
                {day.ranges.length === 0 ? (
                  <Text className="text-xs italic text-foreground-muted">Não atende</Text>
                ) : (
                  <View className="gap-2">
                    {day.ranges.map((r, idx) => (
                      <View key={idx} className="flex-row items-center gap-2">
                        <TimeInput
                          value={r.opensAt}
                          onChange={(v) => updateRange(day.weekday, idx, 'opensAt', v)}
                          disabled={saving}
                        />
                        <Text className="text-xs text-foreground-muted">até</Text>
                        <TimeInput
                          value={r.closesAt}
                          onChange={(v) => updateRange(day.weekday, idx, 'closesAt', v)}
                          disabled={saving}
                        />
                        <Pressable
                          onPress={() => removeRange(day.weekday, idx)}
                          disabled={saving}
                          className="ml-1 h-8 w-8 items-center justify-center rounded-md active:opacity-60"
                          accessibilityLabel="Remover faixa"
                        >
                          <Trash2 size={16} color="#727B8E" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={() => addRange(day.weekday)}
                  disabled={saving}
                  className="mt-2 flex-row items-center gap-1 self-start rounded-md border border-border px-3 py-1.5 active:opacity-60"
                >
                  <Plus size={14} color="#727B8E" />
                  <Text className="text-xs text-foreground-muted">Adicionar faixa</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {saveError ? (
          <Text className="mt-2 text-sm text-destructive" accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}
        {savedFlash ? <Text className="mt-2 text-sm text-success">Salvo!</Text> : null}
      </ScrollView>

      <View className="border-t border-border bg-background px-6 pb-6 pt-4">
        <Pressable
          onPress={save}
          disabled={saving || !loaded}
          className="items-center justify-center rounded-lg bg-primary px-4 py-4 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Salvar agenda</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
