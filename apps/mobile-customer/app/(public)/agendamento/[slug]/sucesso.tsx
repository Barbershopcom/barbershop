import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useBooking } from '@/lib/booking-context';
import { formatPriceBRL } from '@/lib/format';

export default function SucessoScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();

  const handleGoHome = () => {
    booking.reset();
    router.replace('/(main)');
  };

  const handleViewAppointments = () => {
    booking.reset();
    router.replace('/(main)/agenda');
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 items-center justify-center px-6 py-12">
        {/* Check animation placeholder */}
        <View className="mb-8 items-center justify-center">
          <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-green-500 bg-green-50">
            <Check size={48} color="#10b981" strokeWidth={1.5} />
          </View>
        </View>

        {/* Título */}
        <Text className="mb-2 font-display text-3xl font-bold uppercase text-navy">TUDO</Text>
        <Text className="mb-6 text-center font-serif text-sm italic text-foreground-muted">
          Seu corte está confirmado! O {booking.state.selectedBarber?.displayName} te
          espera no horário marcado.
        </Text>

        {/* Status */}
        <View className="mb-8 w-full max-w-xs rounded-lg bg-blue-50 px-4 py-3 text-center">
          <Text className="text-xs font-bold uppercase text-navy">● CONFIRMADO</Text>
        </View>

        {/* Detalhes */}
        <View className="mb-12 w-full gap-4 rounded-lg bg-card p-6">
          <View>
            <Text className="font-display text-lg font-bold uppercase text-navy">
              {booking.state.barbershopName}
            </Text>
            {/* TODO: adicionar appointmentId ao booking.state após criar appointment */}
            <Text className="text-xs text-foreground-muted">Comanda confirmada</Text>
          </View>

          <View className="border-t border-border pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm text-foreground">DATA</Text>
              <Text className="font-semibold text-foreground">
                {booking.state.selectedDate?.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">HORÁRIO</Text>
              <Text className="font-semibold text-foreground">
                {booking.state.selectedTime}
              </Text>
            </View>
          </View>

          <View className="border-t border-border pt-4">
            <View className="gap-2">
              {Array.from(booking.state.selectedServiceIds).map((serviceId) => {
                const service = booking.state.services.get(serviceId);
                return (
                  <View key={serviceId} className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm text-foreground">{service?.name ?? 'Serviço'}</Text>
                      <Text className="text-xs text-foreground-muted">
                        {service?.durationMin ? `${service.durationMin} min` : ''}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-foreground">
                      {formatPriceBRL(service?.basePriceCents ?? 0)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="mb-3 flex-row items-center justify-between border-t border-border pt-3 mt-3">
              <Text className="text-sm font-semibold text-foreground">Total</Text>
              <Text className="font-bold text-navy">{formatPriceBRL(booking.state.totalPrice || 0)}</Text>
            </View>
          </View>

          {/* Barbeiro */}
          <View className="border-t border-border pt-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-navy">
                <Text className="text-xs font-bold text-white">
                  {booking.state.selectedBarber?.displayName
                    ?.slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  {booking.state.selectedBarber?.displayName}
                </Text>
                <Text className="text-xs text-foreground-muted">seu barbeiro</Text>
              </View>
              <View>
                <Text className="text-right text-xs font-semibold text-green-600">
                  ✓ Pix • pago
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <View className="w-full gap-3">
          <Pressable
            onPress={handleViewAppointments}
            className="items-center justify-center rounded-lg bg-navy py-4 active:opacity-80"
          >
            <Text className="font-display text-base font-bold text-white">
              📅 Ver meus agendamentos
            </Text>
          </Pressable>
          <Pressable
            onPress={handleGoHome}
            className="items-center justify-center rounded-lg border border-navy bg-background py-4 active:bg-blue-50"
          >
            <Text className="font-display text-base font-bold text-navy">
              Voltar pra home
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
