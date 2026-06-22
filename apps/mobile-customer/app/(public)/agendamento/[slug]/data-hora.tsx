import type { Slot, SlotsResponse } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { formatTimeInTz, formatYMD } from '@/lib/format';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; timezone: string; slots: Slot[] }
  | { kind: 'error'; message: string };

/** YYYY-MM-DD de um instante UTC, no timezone do tenant. */
function ymdInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export default function AgendamentoDataHoraScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const barberId = booking.state.selectedBarber?.id;
  // serviceId único: o endpoint de slots é single-service. Multiservice
  // fica deferido (ver TODO em b/[slug]/agendar.tsx).
  const serviceId = Array.from(booking.state.selectedServiceIds)[0];

  useEffect(() => {
    if (!slug || !barberId || !serviceId) return;
    let cancelled = false;

    (async () => {
      try {
        const today = new Date();
        const to = new Date(today);
        to.setDate(to.getDate() + 13); // janela de 14 dias (limite do endpoint)

        const params = new URLSearchParams({
          serviceId,
          from: formatYMD(today),
          to: formatYMD(to),
        });
        // 'any' = qualquer barbeiro → não envia barberId (o backend
        // considera todos com capability pro serviço).
        if (barberId !== 'any') params.set('barberId', barberId);

        const data = await api.get<SlotsResponse>(
          `/public/tenants/${encodeURIComponent(slug)}/slots?${params.toString()}`,
        );
        if (cancelled) return;
        setState({ kind: 'ready', timezone: data.timezone, slots: data.slots });
        const firstDate = data.slots[0]
          ? ymdInTz(data.slots[0].startAt, data.timezone)
          : null;
        if (firstDate) setSelectedDate(firstDate);
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Erro ao carregar',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, barberId, serviceId]);

  const availableDates = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const dates = new Set(state.slots.map((s) => ymdInTz(s.startAt, state.timezone)));
    return Array.from(dates).sort();
  }, [state]);

  // Slots do dia selecionado. Para "qualquer barbeiro", o mesmo horário
  // pode aparecer para vários barbeiros — deduplica por horário, ficando
  // com o primeiro barbeiro disponível.
  const slotsForDate = useMemo(() => {
    if (state.kind !== 'ready' || !selectedDate) return [];
    const byTime = new Map<string, Slot>();
    for (const slot of state.slots) {
      if (ymdInTz(slot.startAt, state.timezone) !== selectedDate) continue;
      const time = formatTimeInTz(slot.startAt, state.timezone);
      if (!byTime.has(time)) byTime.set(time, slot);
    }
    return Array.from(byTime, ([time, slot]) => ({ time, slot })).sort((a, b) =>
      a.time.localeCompare(b.time),
    );
  }, [state, selectedDate]);

  const handleContinue = () => {
    if (!selectedSlot) return;
    // Se o cliente escolheu "qualquer barbeiro", resolve o barbeiro concreto
    // do slot escolhido (o POST exige um barberId real).
    if (barberId === 'any') {
      booking.setBarber(selectedSlot.barberId, selectedSlot.barberName);
    }
    // Guarda o instante UTC real do slot (preserva o horário escolhido).
    booking.setDateTime(
      new Date(selectedSlot.startAt),
      state.kind === 'ready'
        ? formatTimeInTz(selectedSlot.startAt, state.timezone)
        : '',
    );
    router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/dados`);
  };

  if (state.kind === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="text-sm text-destructive">{state.message}</Text>
        <Pressable onPress={() => router.back()} className="rounded-md bg-navy px-4 py-2">
          <Text className="text-sm font-semibold text-white">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">AGENDAR</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="p-6 pb-24">
        {/* Título */}
        <View className="mb-6">
          <Text className="font-display text-lg font-bold uppercase text-foreground">
            QUANDO FICA BOM?
          </Text>
          <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
            Dias com vaga marcados em verde
          </Text>
        </View>

        {availableDates.length === 0 ? (
          <View className="rounded-lg border border-dashed border-border bg-background-muted py-8">
            <Text className="text-center text-sm text-foreground-muted">
              Sem horários disponíveis nos próximos dias.
            </Text>
          </View>
        ) : (
          <>
            {/* Lista de dias disponíveis */}
            <View className="mb-8 gap-2">
              {availableDates.map((date) => {
                const [year, month, day] = date.split('-') as [string, string, string];
                const dateObj = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day),
                );
                const isSelected = selectedDate === date;
                const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                const dayNum = dateObj.toLocaleDateString('pt-BR', { day: 'numeric' });
                const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });

                return (
                  <Pressable
                    key={date}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                    className={`rounded-lg border-2 p-4 ${
                      isSelected ? 'border-navy bg-blue-50' : 'border-border bg-card'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs uppercase text-foreground-muted">
                          {dayName}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Text className="font-display text-xl font-bold text-foreground">
                            {dayNum}
                          </Text>
                          <Text className="text-xs text-foreground-muted">{monthName}</Text>
                        </View>
                      </View>
                      <View
                        className={`h-3 w-3 rounded-full ${
                          isSelected ? 'bg-navy' : 'bg-green-500'
                        }`}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Horários */}
            {selectedDate && (
              <>
                <View className="mb-4">
                  <Text className="font-semibold text-foreground">
                    HORÁRIOS • {selectedDate}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {slotsForDate.length > 0 ? (
                    slotsForDate.map(({ time, slot }) => {
                      const isSelected = selectedSlot?.startAt === slot.startAt;
                      return (
                        <Pressable
                          key={slot.startAt}
                          onPress={() => setSelectedSlot(slot)}
                          className={`rounded-lg px-4 py-3 border ${
                            isSelected
                              ? 'border-navy bg-navy'
                              : 'border-border bg-card active:bg-blue-50'
                          }`}
                        >
                          <Text
                            className={`font-semibold ${
                              isSelected ? 'text-white' : 'text-foreground'
                            }`}
                          >
                            {time}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text className="text-sm text-foreground-muted">
                      Sem horários disponíveis neste dia
                    </Text>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleContinue}
          disabled={!selectedSlot}
          className={`items-center justify-center rounded-lg py-4 ${
            !selectedSlot ? 'bg-foreground-muted/30' : 'bg-navy active:opacity-80'
          }`}
        >
          <Text className="font-display text-base font-bold text-white">
            Ir para pagamento →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
