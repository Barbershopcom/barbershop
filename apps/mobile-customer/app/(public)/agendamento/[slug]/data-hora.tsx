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

interface SlotDto {
  date: string;
  time: string;
  available: boolean;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; slots: SlotDto[] }
  | { kind: 'error'; message: string };

export default function AgendamentoDataHoraScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    if (
      !slug ||
      !booking.state.selectedBarber ||
      booking.state.selectedServiceIds.size === 0
    )
      return;

    (async () => {
      try {
        const serviceIds = Array.from(booking.state.selectedServiceIds).join(',');
        const slots = await api.get<SlotDto[]>(
          `/public/tenants/${encodeURIComponent(slug)}/slots?barberId=${booking.state.selectedBarber?.id}&services=${serviceIds}`,
        );
        setState({ kind: 'ready', slots });
        // Pre-select first available date
        const firstDate = slots.find((s) => s.available)?.date;
        if (firstDate) setSelectedDate(firstDate);
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Erro ao carregar',
        });
      }
    })();
  }, [slug, booking.state.selectedBarber, booking.state.selectedServiceIds]);

  const availableDates = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const dates = new Set(state.slots.filter((s) => s.available).map((s) => s.date));
    return Array.from(dates).sort();
  }, [state]);

  const availableTimes = useMemo(() => {
    if (state.kind !== 'ready' || !selectedDate) return [];
    return state.slots
      .filter((s) => s.date === selectedDate && s.available)
      .map((s) => s.time)
      .sort();
  }, [state, selectedDate]);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return;
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return;
    const [year, month, day] = parts as [string, string, string];
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    booking.setDateTime(date, selectedTime);
    router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/pagamento`);
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

        {/* Calendar simplificado */}
        <View className="mb-8 gap-2">
          {availableDates
            .filter((date) => date.split('-').length === 3)
            .map((date) => {
              const [year, month, day] = date.split('-') as [string, string, string];
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const isSelected = selectedDate === date;
              const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
              const dayNum = dateObj.toLocaleDateString('pt-BR', { day: 'numeric' });
              const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });

            return (
              <Pressable
                key={date}
                onPress={() => setSelectedDate(date)}
                className={`rounded-lg border-2 p-4 ${
                  isSelected ? 'border-navy bg-blue-50' : 'border-border bg-card'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs uppercase text-foreground-muted">{dayName}</Text>
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
              {availableTimes.length > 0 ? (
                availableTimes.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => setSelectedTime(time)}
                    className={`rounded-lg px-4 py-3 border ${
                      selectedTime === time
                        ? 'border-navy bg-navy'
                        : 'border-border bg-card active:bg-blue-50'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedTime === time ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {time}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text className="text-sm text-foreground-muted">
                  Sem horários disponíveis neste dia
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className={`items-center justify-center rounded-lg py-4 ${
            !selectedDate || !selectedTime
              ? 'bg-foreground-muted/30'
              : 'bg-navy active:opacity-80'
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
