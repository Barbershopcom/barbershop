import type { PublicServiceDto, PublicTenantDto } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { formatDurationLabel, formatPriceBRL } from '@/lib/format';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; services: PublicServiceDto[] }
  | { kind: 'error'; message: string };

export default function AgendamentoServicoScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!slug || !booking.state.barbershopId) return;

    (async () => {
      try {
        const services = await api.get<PublicServiceDto[]>(
          `/public/tenants/${encodeURIComponent(slug)}/services`,
        );
        setState({ kind: 'ready', services });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Erro ao carregar',
        });
      }
    })();
  }, [slug, booking.state.barbershopId]);

  const handleContinue = () => {
    if (booking.state.selectedServiceIds.size > 0) {
      router.push(
        `/(public)/agendamento/${encodeURIComponent(slug)}/barbeiro`,
      );
    }
  };

  const totalPrice = Array.from(booking.state.selectedServiceIds).reduce(
    (acc) => acc,
    0,
  );

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

  const { services } = state;
  const selectedServices = Array.from(booking.state.selectedServiceIds)
    .map((id) => services.find((s) => s.id === id))
    .filter(Boolean) as PublicServiceDto[];

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

      <ScrollView contentContainerClassName="p-6 pb-32">
        {/* Resumo */}
        <View className="mb-6">
          <Text className="font-display text-lg font-bold uppercase text-foreground">
            {booking.state.barbershopName}
          </Text>
          <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
            Serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Lista de serviços */}
        <View className="mb-8 gap-2">
          {selectedServices.map((service) => (
            <View
              key={service.id}
              className="flex-row items-center justify-between rounded-lg bg-card px-4 py-3 border border-border"
            >
              <View className="flex-1">
                <Text className="font-semibold text-foreground">{service.name}</Text>
                <Text className="text-xs text-foreground-muted">
                  {formatDurationLabel(service.durationMin)}
                </Text>
              </View>
              <Text className="font-bold text-navy">{formatPriceBRL(service.basePriceCents)}</Text>
            </View>
          ))}
        </View>

        {/* Próximo passo */}
        <View className="rounded-lg bg-blue-50 p-4 mb-6">
          <Text className="text-xs font-semibold uppercase text-foreground-muted">
            Próximo: escolher barbeiro
          </Text>
          <Text className="text-sm text-foreground-muted">
            Veja quem pode fazer esses serviços
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleContinue}
          className="items-center justify-center rounded-lg bg-navy py-4 active:opacity-80"
        >
          <Text className="font-display text-base font-bold text-white">
            Continuar →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
