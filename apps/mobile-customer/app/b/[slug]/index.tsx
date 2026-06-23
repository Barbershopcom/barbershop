import { useRouter } from 'expo-router';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';

import { useSession } from '@/lib/session';
import { useTenant } from '@/lib/tenant-context';
import { useQuery } from '@/lib/use-query';
import { api } from '@/lib/api';
import type { MyCustomerAppointmentItem } from '@barbearia/schemas';

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useSession();
  const tenantState = useTenant();

  const isAuthenticated = state.status === 'authenticated';
  const barbershopName =
    tenantState.status === 'ready' ? tenantState.tenant.name : '';
  const slug = tenantState.status === 'ready' ? tenantState.tenant.slug : '';

  const { data: appointments, isLoading: apptLoading } =
    useQuery<MyCustomerAppointmentItem[]>({
      queryFn: () =>
        api.get<MyCustomerAppointmentItem[]>('/me/customer-appointments'),
      enabled: isAuthenticated,
    });

  // Pick the next FUTURE appointment (earliest upcoming) using the real `startAt` field.
  const next = appointments
    ?.filter((a) => new Date(a.startAt) > new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-6 py-8 gap-6"
    >
      {/* Barbershop name */}
      {barbershopName ? (
        <Text className="font-display text-2xl font-bold text-foreground">
          {barbershopName}
        </Text>
      ) : null}

      {isAuthenticated ? (
        <>
          {/* Next appointment card */}
          {apptLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#1a365d" />
            </View>
          ) : next ? (
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="text-xs uppercase tracking-wide text-foreground-muted">
                Próximo agendamento
              </Text>
              <Text className="mt-1 font-semibold text-foreground">
                {next.service.name} —{' '}
                {new Date(next.startAt).toLocaleString('pt-BR')}
              </Text>
              {next.tenant?.name ? (
                <Text className="mt-1 text-xs text-foreground-muted">
                  {next.tenant.name}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="text-center text-sm text-foreground-muted">
                Você não tem agendamentos futuros.
              </Text>
            </View>
          )}

          {/* Shortcuts */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push(`/(public)/agendamento/${slug}`)}
              className="flex-1 items-center rounded-lg bg-navy py-4 active:opacity-80"
            >
              <Text className="font-semibold text-white">Agendar</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/b/${slug}/agenda`)}
              className="flex-1 items-center rounded-lg border border-border py-4 active:bg-blue-50"
            >
              <Text className="font-semibold text-foreground">Histórico</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {/* Guest CTA */}
          <Pressable
            onPress={() => router.push(`/(public)/agendamento/${slug}`)}
            className="items-center rounded-lg bg-navy py-4 active:opacity-80"
          >
            <Text className="font-semibold text-white">Agendar agora</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text className="text-center text-navy">
              Entrar para ver seus agendamentos
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
