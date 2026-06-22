import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { formatPriceBRL } from '@/lib/format';

interface PaymentStatusResponse {
  status: string | null; // 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'
  appointmentStatus: string;
  paidAt: string | null;
}

export default function PixScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [copied, setCopied] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Aguardando pagamento...');

  // appointmentId vem do booking context (pós-checkout), não da URL — evita
  // IDOR. O servidor valida ownership.
  const appointmentId = booking.state.appointmentId;
  const pixCode = booking.state.pixQrCode;
  const pixBase64 = booking.state.pixQrCodeBase64;

  // Polling de status do pagamento.
  useEffect(() => {
    if (!appointmentId || !slug) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await api.get<PaymentStatusResponse>(
          `/public/appointments/${appointmentId}/payment`,
        );
        if (cancelled) return;

        if (res.status === 'paid' || res.appointmentStatus !== 'awaiting_payment') {
          setStatusLabel('Pagamento confirmado!');
          clearInterval(pollInterval);
          setTimeout(() => {
            if (!cancelled) {
              router.replace(
                `/(public)/agendamento/${encodeURIComponent(slug)}/sucesso`,
              );
            }
          }, 1200);
        } else if (res.status === 'failed' || res.status === 'expired') {
          setStatusLabel('Pagamento não concluído. Tente novamente.');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
      }
    };

    const pollInterval = setInterval(poll, 3000);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [appointmentId, slug, router]);

  const handleCopyPixCode = () => {
    if (pixCode) {
      Clipboard.setString(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">PAGAR COM PIX</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="items-center px-6 py-8 pb-24">
        {/* Valor */}
        <Text className="font-display text-2xl font-bold text-navy">
          {formatPriceBRL(booking.state.totalPrice || 0)}
        </Text>
        <Text className="mt-1 text-xs text-foreground-muted">
          {booking.state.barbershopName?.toUpperCase() || 'BARBEARIA'} • COMANDA #
          {appointmentId?.slice(0, 4).toUpperCase()}
        </Text>

        {/* QR Code */}
        <View className="my-8 items-center">
          <View className="h-48 w-48 items-center justify-center rounded-lg bg-white p-4 shadow-sm">
            {pixBase64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${pixBase64}` }}
                style={{ width: 176, height: 176 }}
                resizeMode="contain"
              />
            ) : (
              <Text className="text-center text-xs text-foreground-muted">
                QR Code indisponível — use o copia e cola abaixo.
              </Text>
            )}
          </View>
          <Text className="mt-3 text-center font-serif text-xs italic text-foreground-muted">
            Escaneie com o app do seu banco
          </Text>
        </View>

        {/* Pix Copia e Cola */}
        {pixCode ? (
          <View className="w-full">
            <Text className="mb-2 font-semibold text-foreground">PIX COPIA E COLA</Text>
            <View className="mb-2 flex-row items-center gap-2 rounded-lg bg-card px-4 py-3">
              <Text numberOfLines={1} className="flex-1 font-mono text-xs text-foreground">
                {pixCode}
              </Text>
              <Pressable onPress={handleCopyPixCode} className="p-2">
                <Copy size={18} color="#1a365d" />
              </Pressable>
            </View>
            {copied ? <Text className="text-xs text-green-600">✓ Copiado!</Text> : null}
          </View>
        ) : null}

        {/* Status */}
        <View className="mt-8 flex-row items-center gap-2">
          <ActivityIndicator color="#10b981" size="small" />
          <Text className="text-sm font-semibold text-green-600">{statusLabel}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
