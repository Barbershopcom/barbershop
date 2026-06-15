import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';

interface EmployeeDto {
  id: string;
  displayName: string;
  photoUrl?: string;
  ratingAvg?: number;
  ratingCount?: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; employees: EmployeeDto[] }
  | { kind: 'error'; message: string };

export default function AgendamentoBarbeiroScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!slug || booking.state.selectedServiceIds.size === 0) return;

    (async () => {
      try {
        const serviceIds = Array.from(booking.state.selectedServiceIds).join(',');
        const employees = await api.get<EmployeeDto[]>(
          `/public/tenants/${encodeURIComponent(slug)}/employees?services=${serviceIds}`,
        );
        setState({ kind: 'ready', employees });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Erro ao carregar',
        });
      }
    })();
  }, [slug, booking.state.selectedServiceIds]);

  const handleSelectBarber = (id: string, name: string) => {
    booking.setBarber(id, name);
    router.push(
      `/(public)/agendamento/${encodeURIComponent(slug)}/data-hora`,
    );
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

  const { employees } = state;

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
            COM QUEM?
          </Text>
          <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
            Só barbeiros que fazem os serviços escolhidos
          </Text>
        </View>

        {/* Opção: Qualquer barbeiro */}
        <Pressable
          onPress={() => handleSelectBarber('any', 'Qualquer barbeiro')}
          className="mb-4 flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 active:bg-blue-50"
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-foreground-muted">
            <Text className="text-xs text-white">👤</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground">Qualquer barbeiro</Text>
            <Text className="text-xs text-green-600">• Mais cedo hoje 15:00</Text>
          </View>
          <View className="h-5 w-5 rounded-full border-2 border-border" />
        </Pressable>

        {/* Lista de barbeiros */}
        {employees.length > 0 ? (
          <View className="gap-2">
            {employees.map((employee) => (
              <Pressable
                key={employee.id}
                onPress={() => handleSelectBarber(employee.id, employee.displayName)}
                className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 active:bg-blue-50"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-navy">
                  <Text className="font-bold text-white">
                    {employee.displayName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {employee.displayName}
                  </Text>
                  {employee.ratingAvg ? (
                    <Text className="text-xs text-foreground-muted">
                      ⭐ {employee.ratingAvg.toFixed(1)} • próx.{' '}
                      {employee.ratingCount ?? 0} cortes
                    </Text>
                  ) : (
                    <Text className="text-xs text-foreground-muted">Sem avaliações</Text>
                  )}
                </View>
                <View className="h-5 w-5 rounded-full border-2 border-border" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center rounded-lg bg-background p-6">
            <Text className="text-center text-sm text-foreground-muted">
              Nenhum barbeiro disponível para esses serviços
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
