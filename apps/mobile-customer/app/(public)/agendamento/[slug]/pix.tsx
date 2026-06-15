import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Share,
  Clipboard,
} from 'react-native';

import { api } from '@/lib/api';
import { formatPriceBRL } from '@/lib/format';

interface PaymentStatusDto {
  status: 'pending' | 'completed' | 'failed' | 'expired';
  expiresAt: string;
  qrCode?: string;
  copieAndPaste?: string;
}

export default function PixScreen() {
  const router = useRouter();
  const { appointmentId, paymentId } = useLocalSearchParams<{
    appointmentId?: string;
    paymentId?: string;
  }>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Polling de status
  useEffect(() => {
    if (!paymentId) return;

    let pollInterval: NodeJS.Timeout;

    const pollPayment = async () => {
      try {
        const status = await api.get<PaymentStatusDto>(`/payments/${paymentId}/status`);
        setPaymentStatus(status);
        setLoading(false);

        // Se pagamento foi confirmado, redireciona pro sucesso
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setTimeout(() => {
            router.replace({
              pathname: `/(public)/agendamento/:slug/sucesso`,
              params: { appointmentId: appointmentId || '' },
            });
          }, 1500);
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
      }
    };

    // Primeira verificação imediata
    void pollPayment();

    // Depois a cada 3 segundos
    pollInterval = setInterval(pollPayment, 3000);

    return () => clearInterval(pollInterval);
  }, [paymentId, appointmentId, router]);

  const handleCopyPixCode = async () => {
    if (paymentStatus?.copieAndPaste) {
      await Clipboard.setString(paymentStatus.copieAndPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !paymentStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  const expiresAt = new Date(paymentStatus.expiresAt);
  const now = new Date();
  const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);

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
          {formatPriceBRL(7600)}
        </Text>
        <Text className="mt-1 text-xs text-foreground-muted">
          BARBEARIA DO JAJÁ • COMANDA 0427
        </Text>

        {/* Expiração */}
        <View className="my-4 rounded-full border border-gold bg-gold/10 px-4 py-2">
          <Text className="text-xs font-semibold text-gold">
            ⏱ expira em {String(minutesLeft).padStart(2, '0')}:{String((expiresAt.getSeconds())).padStart(2, '0')}
          </Text>
        </View>

        {/* QR Code */}
        <View className="my-8 items-center">
          <View className="h-48 w-48 items-center justify-center rounded-lg bg-white p-4 shadow-sm">
            {paymentStatus.qrCode ? (
              <Text className="text-center text-xs text-foreground-muted">
                [QR Code: {paymentStatus.qrCode.slice(0, 30)}...]
              </Text>
            ) : (
              <Text className="text-xs text-foreground-muted">QR Code gerado</Text>
            )}
          </View>
          <Text className="mt-3 text-center font-serif text-xs italic text-foreground-muted">
            Escaneie com o app do seu banco
          </Text>
        </View>

        {/* Pix Copia e Cola */}
        <View className="w-full">
          <Text className="mb-2 font-semibold text-foreground">PIX COPIA E COLA</Text>
          <View className="mb-2 flex-row items-center gap-2 rounded-lg bg-card px-4 py-3">
            <Text
              numberOfLines={1}
              className="flex-1 font-mono text-xs text-foreground"
            >
              {paymentStatus.copieAndPaste || '00020126580014...'}
            </Text>
            <Pressable onPress={handleCopyPixCode} className="p-2">
              <Copy size={18} color="#1a365d" />
            </Pressable>
          </View>
          {copied && (
            <Text className="text-xs text-green-600">✓ Copiado!</Text>
          )}
        </View>

        {/* Instruções */}
        <View className="mt-8 w-full space-y-3">
          <View className="flex-row gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-gold">
              <Text className="font-bold text-white">1</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground-muted">
              Abra o app do seu banco e escolha pagar via Pix.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-gold">
              <Text className="font-bold text-white">2</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground-muted">
              Escaneie o QR ou cole o código copia e cola.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-gold">
              <Text className="font-bold text-white">3</Text>
            </View>
            <Text className="flex-1 text-sm text-foreground-muted">
              Confirme — a tela atualiza sozinha ao recebermos.
            </Text>
          </View>
        </View>

        {/* Status */}
        <View className="mt-8 flex-row items-center gap-2">
          <View className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
          <Text className="text-sm font-semibold text-green-600">
            Aguardando pagamento...
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
