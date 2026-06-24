import type {
  BookedAppointment,
  PaymentDto,
  PaymentMethod,
} from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { formatPriceBRL } from '@/lib/format';
import { generateUuid } from '@/lib/uuid';

type UiPaymentMethod = 'pix' | 'credit_card';

interface PayResponse {
  payment: PaymentDto;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

export default function PagamentoScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [paymentMethod, setPaymentMethod] = useState<UiPaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Persiste entre re-submits no mesmo ciclo de vida (evita appointment duplicado).
  const idemKeyRef = useRef<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    const serviceId = Array.from(booking.state.selectedServiceIds)[0];
    const barberId = booking.state.selectedBarber?.id;
    const startAt = booking.state.selectedDate?.toISOString();
    const { customerName, customerPhone, customerEmail } = booking.state;

    if (!serviceId || !barberId || barberId === 'any' || !startAt) {
      setError('Dados do agendamento incompletos. Volte e revise.');
      return;
    }
    if (!customerName || !customerPhone) {
      setError('Faltam seus dados. Volte e confirme nome e telefone.');
      return;
    }

    setLoading(true);
    try {
      // 1. Cria o appointment (nasce awaiting_payment). Idempotency-Key
      //    blinda contra double-tap.
      if (!idemKeyRef.current) idemKeyRef.current = generateUuid();
      const booked = await api.post<BookedAppointment>(
        `/public/tenants/${encodeURIComponent(slug)}/appointments`,
        {
          serviceId,
          barberId,
          startAt,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
        },
        { idempotencyKey: idemKeyRef.current },
      );
      booking.setAppointmentId(booked.id);
      // Persiste o token de posse no contexto (H3 secfix).
      booking.setPaymentToken(booked.cancelToken ?? null);

      // 2. Cobra via método escolhido (mock aprova na hora → pending).
      const method: PaymentMethod = paymentMethod === 'pix' ? 'pix' : 'credit';
      const possessionToken = booked.cancelToken;
      if (!possessionToken) {
        // Server não emitiu token — não deve acontecer em prod;
        // falha explícita pra não chamar pay sem posse.
        throw new Error('Token de posse ausente na resposta do booking.');
      }
      const pay = await api.post<PayResponse>(
        `/public/appointments/${booked.id}/payment/pay`,
        { method, possessionToken },
      );

      if (method === 'pix') {
        booking.setPixPayload(pay.pixQrCode ?? null, pay.pixQrCodeBase64 ?? null);
        router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/pix`);
      } else {
        router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/sucesso`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Esse horário acabou de ser reservado. Escolha outro.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Erro de rede.');
      }
    } finally {
      setLoading(false);
    }
  };

  // TODO: buscar preços reais dos serviços selecionados via API
  // Por agora, usar preços do booking context (será implementado em: BookingContext.toggleService)
  const subtotal = booking.state.totalPrice || 0;
  const discount = 0; // TODO: implementar validação de cupom
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
            Comanda nº {booking.state.appointmentId?.slice(0, 4).toUpperCase() ?? '—'}
          </Text>

          <View className="mb-3 gap-2 border-b border-border pb-3">
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

          {/* Barbeiro */}
          {booking.state.selectedBarber && (
            <View className="mb-3 flex-row items-center gap-2 border-b border-border pb-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-navy">
                <Text className="text-xs font-bold text-white">
                  {booking.state.selectedBarber.displayName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {booking.state.selectedBarber.displayName}
                </Text>
                <Text className="text-xs text-foreground-muted">seu barbeiro</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-gold">
                  ⭐ {booking.state.selectedBarber.ratingAvg?.toFixed(1) ?? '—'}
                </Text>
              </View>
            </View>
          )}

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
        {error ? (
          <View className="mb-3 rounded-md bg-red-50 px-3 py-2">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}
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
