import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface Params {
  id?: string;
  tz?: string;
  tenantName?: string;
  tenantSlug?: string;
  serviceName?: string;
  startAt?: string;
  customerName?: string;
  customerEmail?: string;
}

export default function SucessoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Params;

  const slotLabel =
    params.startAt && params.tz
      ? formatSlotLabel(params.startAt, params.tz)
      : null;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <View className="items-center pt-10">
        <CheckCircle2 size={64} color="#1a365d" strokeWidth={1.5} />
        <Text className="mt-4 text-center text-2xl font-bold text-slate-900">
          Agendamento confirmado!
        </Text>
        {params.tenantName ? (
          <Text className="mt-1 text-center text-sm text-slate-500">
            {params.tenantName}
          </Text>
        ) : null}
      </View>

      {slotLabel || params.serviceName || params.customerName ? (
        <View className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {params.serviceName ? <Row label="Serviço" value={params.serviceName} /> : null}
          {slotLabel ? <Row label="Data e hora" value={slotLabel} /> : null}
          {params.customerName ? <Row label="Cliente" value={params.customerName} /> : null}
          {params.customerEmail ? <Row label="Email" value={params.customerEmail} /> : null}
        </View>
      ) : null}

      {params.customerEmail ? (
        <Text className="mt-6 text-center text-xs text-slate-500">
          Confirmação e link de cancelamento enviados para{' '}
          <Text className="font-semibold">{params.customerEmail}</Text>.
        </Text>
      ) : (
        <Text className="mt-6 text-center text-xs text-slate-500">
          Anote o horário ou tire um print dessa tela.
        </Text>
      )}

      <Pressable
        onPress={() =>
          params.tenantSlug
            ? router.replace(`/b/${encodeURIComponent(params.tenantSlug)}`)
            : router.replace('/')
        }
        className="mt-8 items-center justify-center rounded-md bg-slate-900 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">
          Voltar à barbearia
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3 py-1.5">
      <Text className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-medium text-slate-900">
        {value}
      </Text>
    </View>
  );
}

function formatSlotLabel(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
