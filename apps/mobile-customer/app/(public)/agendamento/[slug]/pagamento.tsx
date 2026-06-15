import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { formatPriceBRL } from '@/lib/format';

type PaymentMethod = 'pix' | 'credit_card';

export default function PagamentoScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!booking.state.selectedDate || !booking.state.selectedTime) return;

    setLoading(true);
    try {
      const payload = {
        tenantId: booking.state.barbershopId,
        serviceIds: Array.from(booking.state.selectedServiceIds),
        employeeId: booking.state.selectedBarber?.id || null,
        startAt: booking.state.selectedDate?.toISOString() || new Date().toISOString(),
        preferredPaymentMethod: paymentMethod,
      };

      const result = await api.post<{ appointmentId: string; paymentId?: string }>(
        `/appointments`,
        payload,
      );

      // Se for Pix, vai pra tela de status
      if (paymentMethod === 'pix') {
        // appointmentId fica no booking context (seguro)
        router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/pix`);
      } else {
        // Se for cartão ou outro, vai pro sucesso
        router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/sucesso`);
      }
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = 8000; // Dummy: seria sum dos preços dos serviços
  const discount = 400; // Dummy: desconto 1º corte
  const taxPix = 0;
  const total = subtotal - discount + taxPix;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">PAGAMENTO</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="p-6 pb-32">
        {/* Barbershop info */}
        <View className="mb-6 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-lg bg-navy">
            <Text className="text-xs font-bold text-white">
              {booking.state.barbershopName?.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground">
              {booking.state.barbershopName}
            </Text>
            <Text className="text-xs text-foreground-muted">
              R. Aurora, 120 • Pinheiros, SP
            </Text>
          </View>
        </View>

        {/* Resumo da comanda */}
        <View className="mb-6 rounded-lg bg-card p-4">
          <Text className="mb-3 text-xs font-semibold uppercase text-foreground-muted">
            Comanda nº 0427
          </Text>

          <View className="mb-3 gap-2 border-b border-border pb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">Corte clássico</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatPriceBRL(5000)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground-muted">30 min • tesoura</Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm text-foreground">Barba</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatPriceBRL(3000)}
              </Text>
            </View>
            <Text className="text-sm text-foreground-muted">20 min • fiolha quente</Text>
          </View>

          {/* Barbeiro */}
          <View className="mb-3 flex-row items-center gap-2 border-b border-border pb-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-navy">
              <Text className="text-xs font-bold text-white">JJ</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {booking.state.selectedBarber?.displayName || 'Barbeiro'}
              </Text>
              <Text className="text-xs text-foreground-muted">seu barbeiro</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-gold">⭐ 4.8</Text>
            </View>
          </View>

          {/* Totalizador */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">Subtotal</Text>
              <Text className="text-sm text-foreground">{formatPriceBRL(subtotal)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gold">Desconto • 1º corte</Text>
              <Text className="text-sm font-semibold text-gold">
                − {formatPriceBRL(discount)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">Taxa • Pix</Text>
              <Text className="text-sm text-foreground">Grátis</Text>
            </View>
            <View className="my-2 border-t border-border" />
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-lg font-bold text-foreground">TOTAL</Text>
              <Text className="font-display text-2xl font-bold text-navy">
                {formatPriceBRL(total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Formas de pagamento */}
        <View className="mb-6">
          <Text className="mb-3 font-semibold text-foreground">FORMA DE PAGAMENTO</Text>

          <Pressable
            onPress={() => setPaymentMethod('pix')}
            className={`mb-3 flex-row items-center gap-3 rounded-lg border-2 p-4 ${
              paymentMethod === 'pix' ? 'border-navy bg-blue-50' : 'border-border bg-card'
            }`}
          >
            {paymentMethod === 'pix' ? (
              <CheckCircle2 size={20} color="#1a365d" />
            ) : (
              <Circle size={20} color="#8a8073" strokeWidth={1.5} />
            )}
            <View className="flex-1">
              <Text className="font-semibold text-foreground">Pix</Text>
              <Text className="text-xs text-green-600">Aprovação na hora</Text>
            </View>
            <Text className="text-xs font-semibold text-green-600">Grátis</Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod('credit_card')}
            className={`flex-row items-center gap-3 rounded-lg border-2 p-4 ${
              paymentMethod === 'credit_card'
                ? 'border-navy bg-blue-50'
                : 'border-border bg-card'
            }`}
          >
            {paymentMethod === 'credit_card' ? (
              <CheckCircle2 size={20} color="#1a365d" />
            ) : (
              <Circle size={20} color="#8a8073" strokeWidth={1.5} />
            )}
            <View className="flex-1">
              <Text className="font-semibold text-foreground">Cartão de crédito</Text>
              <Text className="text-xs text-foreground-muted">Parcelado em até 3x</Text>
            </View>
            <Text className="text-xs text-foreground">+ R$ 3,80</Text>
          </Pressable>
        </View>

        {/* Disclaimer */}
        <Text className="text-center text-xs text-foreground-muted">
          aceite a política de cancelamento pra continuar
        </Text>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleConfirm}
          disabled={loading}
          className={`items-center justify-center rounded-lg py-4 ${
            loading ? 'bg-foreground-muted/30' : 'bg-navy active:opacity-80'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-display text-base font-bold text-white">
              Confirmar e pagar {formatPriceBRL(total)}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
