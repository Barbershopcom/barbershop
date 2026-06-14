import { useLocalSearchParams, useRouter } from 'expo-router';
import { QrCode } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { formatPriceBRL } from '@/lib/format';

interface PayResult {
  payment: { status: string };
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}
interface StatusResult {
  status: string | null;
  appointmentStatus: string;
}

type Phase =
  | { kind: 'method' }
  | { kind: 'pix'; qr?: string; qrBase64?: string }
  | { kind: 'error'; message: string };

const PIX_SECONDS = 10 * 60;

export default function PagamentoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    slug: string;
    tz?: string;
    tenantName?: string;
    tenantSlug?: string;
    serviceName?: string;
    startAt?: string;
    customerName?: string;
    customerEmail?: string;
    priceCents?: string;
  }>();

  const [phase, setPhase] = useState<Phase>({ kind: 'method' });
  const [paying, setPaying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PIX_SECONDS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const priceCents = Number(params.priceCents ?? '0');

  const goToSuccess = useCallback(() => {
    router.replace({
      pathname: `/b/${encodeURIComponent(params.slug)}/sucesso`,
      params: {
        id: params.id,
        tz: params.tz,
        tenantName: params.tenantName,
        tenantSlug: params.tenantSlug ?? params.slug,
        serviceName: params.serviceName,
        startAt: params.startAt,
        customerName: params.customerName,
        customerEmail: params.customerEmail ?? '',
      },
    });
  }, [router, params]);

  // Limpa timers ao desmontar.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  async function payWithPix() {
    setPaying(true);
    try {
      const res = await api.post<PayResult>(
        `/public/appointments/${encodeURIComponent(params.id)}/payment/pay`,
        { method: 'pix' },
      );
      // Mock aprova na hora; PSP real volta pending + QR.
      if (res.payment.status === 'paid') {
        goToSuccess();
        return;
      }
      setPhase({ kind: 'pix', qr: res.pixQrCode, qrBase64: res.pixQrCodeBase64 });
      startCountdown();
      startPolling();
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Não foi possível iniciar o pagamento.',
      });
    } finally {
      setPaying(false);
    }
  }

  function startCountdown() {
    setSecondsLeft(PIX_SECONDS);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1 && tickRef.current) clearInterval(tickRef.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const st = await api.get<StatusResult>(
          `/public/appointments/${encodeURIComponent(params.id)}/payment`,
        );
        if (st.status === 'paid' || st.appointmentStatus === 'pending') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (tickRef.current) clearInterval(tickRef.current);
          goToSuccess();
        }
      } catch {
        // erro transitório de rede no polling — ignora e tenta de novo
      }
    }, 3000);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
      <Text className="mt-6 font-display text-3xl uppercase tracking-wide text-foreground">
        Pagamento
      </Text>
      {params.serviceName ? (
        <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
          {params.serviceName}
          {params.tenantName ? ` · ${params.tenantName}` : ''}
        </Text>
      ) : null}

      {/* Comanda: total */}
      <View className="mt-6 rounded-lg border border-border bg-card p-4">
        <View className="flex-row justify-between border-b border-dashed border-border py-2">
          <Text className="text-sm text-foreground-muted">Serviço</Text>
          <Text className="text-sm font-medium text-foreground">{formatPriceBRL(priceCents)}</Text>
        </View>
        <View className="flex-row justify-between py-2">
          <Text className="text-sm font-semibold text-foreground">Total no Pix</Text>
          <Text className="font-display text-2xl tracking-wide text-navy">
            {formatPriceBRL(priceCents)}
          </Text>
        </View>
        <Text className="font-serif text-xs italic text-foreground-muted">
          Pix sem taxa · confirmação na hora
        </Text>
      </View>

      {phase.kind === 'method' ? (
        <Pressable
          onPress={payWithPix}
          disabled={paying}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 active:opacity-80 disabled:opacity-60"
        >
          {paying ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <QrCode size={18} color="white" />
              <Text className="text-base font-bold text-primary-foreground">Pagar com Pix</Text>
            </>
          )}
        </Pressable>
      ) : null}

      {phase.kind === 'error' ? (
        <View className="mt-6 gap-3">
          <Text className="text-sm text-destructive">{phase.message}</Text>
          <Pressable
            onPress={() => setPhase({ kind: 'method' })}
            className="items-center rounded-md border border-border py-3"
          >
            <Text className="text-sm font-semibold text-foreground">Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      {phase.kind === 'pix' ? (
        <View className="mt-6 items-center gap-4">
          <Text className="font-serif text-sm italic text-foreground-muted">
            Escaneie o QR no app do seu banco
          </Text>
          {phase.qrBase64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${phase.qrBase64}` }}
              style={{ width: 220, height: 220 }}
              resizeMode="contain"
            />
          ) : (
            <View className="h-56 w-56 items-center justify-center rounded-lg bg-card">
              <QrCode size={64} color="#8a8073" />
            </View>
          )}

          {phase.qr ? (
            <View className="w-full gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Pix copia e cola
              </Text>
              <Text
                selectable
                className="rounded-md border border-border bg-card p-3 text-xs text-foreground"
              >
                {phase.qr}
              </Text>
              <Text className="text-center font-serif text-xs italic text-foreground-muted">
                Toque e segure no código pra copiar.
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#1a365d" />
            <Text className="text-sm text-foreground-muted">
              Aguardando pagamento · expira em {fmt(secondsLeft)}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
