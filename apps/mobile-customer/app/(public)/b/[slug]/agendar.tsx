import type { PublicServiceDto, PublicTenantDto, Slot, SlotsResponse } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import { api, ApiError } from '@/lib/api';
import {
  formatDurationLabel,
  formatPriceBRL,
  formatTimeInTz,
} from '@/lib/format';

LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ],
  monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  today: 'hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

interface BootData {
  tenant: PublicTenantDto;
  service: PublicServiceDto;
}

type BootState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: BootData }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export default function BookingFlow() {
  const router = useRouter();
  const { slug, s: serviceId, t, b: barberId } = useLocalSearchParams<{
    slug: string;
    s?: string;
    t?: string;
    b?: string;
  }>();

  const [boot, setBoot] = useState<BootState>({ kind: 'loading' });

  useEffect(() => {
    if (!slug || !serviceId) return;
    let cancelled = false;

    async function load() {
      try {
        const [tenant, services] = await Promise.all([
          api.get<PublicTenantDto>(`/public/tenants/${encodeURIComponent(slug)}`),
          api.get<PublicServiceDto[]>(`/public/tenants/${encodeURIComponent(slug)}/services`),
        ]);
        const service = services.find((it) => it.id === serviceId);
        if (!service) {
          if (!cancelled) setBoot({ kind: 'not_found' });
          return;
        }
        if (!cancelled) setBoot({ kind: 'ready', data: { tenant, service } });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setBoot({ kind: 'not_found' });
        } else {
          setBoot({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Erro de rede.',
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, serviceId]);

  if (!slug || !serviceId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-sm text-slate-500">Link inválido.</Text>
      </View>
    );
  }

  if (boot.kind === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  if (boot.kind === 'not_found') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <Text className="text-xl font-bold text-slate-900">Serviço não encontrado</Text>
        <Pressable
          onPress={() => router.replace(`/b/${encodeURIComponent(slug)}`)}
          className="mt-2"
        >
          <Text className="text-sm font-medium text-blue-600 underline">
            Voltar à barbearia
          </Text>
        </Pressable>
      </View>
    );
  }

  if (boot.kind === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <Text className="text-base text-red-600">{boot.message}</Text>
      </View>
    );
  }

  const { tenant, service } = boot.data;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 64 }}>
      <View className="px-6 pt-12">
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1"
        >
          <ChevronLeft size={16} color="#64748b" />
          <Text className="text-sm text-slate-500">Trocar serviço</Text>
        </Pressable>

        <Text className="text-xs uppercase tracking-widest text-slate-400">
          {tenant.name}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-slate-900">{service.name}</Text>
        <View className="mt-2 flex-row items-center gap-3">
          <Text className="text-sm text-slate-500">
            {formatDurationLabel(service.durationMin)}
          </Text>
          <Text className="text-slate-300">·</Text>
          <Text className="text-sm font-semibold text-blue-700">
            {formatPriceBRL(service.basePriceCents)}
          </Text>
        </View>
        {service.description ? (
          <Text className="mt-3 text-sm text-slate-500">{service.description}</Text>
        ) : null}
      </View>

      {t && barberId ? (
        <BookingFormPlaceholder
          tenant={tenant}
          onChange={() =>
            router.replace(`/b/${encodeURIComponent(slug)}/agendar?s=${encodeURIComponent(service.id)}`)
          }
          t={t}
        />
      ) : (
        <SlotPicker
          tenant={tenant}
          service={service}
          initialBarberId={barberId}
          onSelect={(slot) =>
            router.replace(
              `/b/${encodeURIComponent(slug)}/agendar?s=${encodeURIComponent(service.id)}&t=${encodeURIComponent(slot.startAt)}&b=${encodeURIComponent(slot.barberId)}`,
            )
          }
        />
      )}
    </ScrollView>
  );
}

interface SlotPickerProps {
  tenant: PublicTenantDto;
  service: PublicServiceDto;
  initialBarberId?: string;
  onSelect: (slot: Slot) => void;
}

function SlotPicker({ tenant, service, initialBarberId, onSelect }: SlotPickerProps) {
  const todayYmd = useMemo(() => todayInTz(tenant.timezone), [tenant.timezone]);
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barberFilter, setBarberFilter] = useState<string | undefined>(initialBarberId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      serviceId: service.id,
      from: selectedDate,
      to: selectedDate,
    });
    if (barberFilter) params.set('barberId', barberFilter);

    api
      .get<SlotsResponse>(
        `/public/tenants/${encodeURIComponent(tenant.slug)}/slots?${params.toString()}`,
      )
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao buscar horários');
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenant.slug, service.id, selectedDate, barberFilter]);

  const barbersInResults = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of slots) m.set(s.barberId, s.barberName);
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [slots]);

  return (
    <View className="mt-6 px-6">
      <Calendar
        current={selectedDate}
        minDate={todayYmd}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#1a365d' },
        }}
        firstDay={0}
        theme={{
          todayTextColor: '#bf212f',
          arrowColor: '#1a365d',
          textMonthFontWeight: 'bold',
        }}
      />

      {barbersInResults.length > 1 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          <FilterPill
            label="Todos"
            active={!barberFilter}
            onPress={() => setBarberFilter(undefined)}
          />
          {barbersInResults.map((b) => (
            <FilterPill
              key={b.id}
              label={b.name}
              active={barberFilter === b.id}
              onPress={() => setBarberFilter(b.id)}
            />
          ))}
        </View>
      ) : null}

      <View className="mt-6">
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#1a365d" />
            <Text className="mt-2 text-xs text-slate-500">Buscando horários...</Text>
          </View>
        ) : error ? (
          <Text className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </Text>
        ) : slots.length === 0 ? (
          <View className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8">
            <Text className="text-center text-sm text-slate-500">
              Sem horários disponíveis nesse dia.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {slots.map((slot) => (
              <Pressable
                key={`${slot.startAt}-${slot.barberId}`}
                onPress={() => onSelect(slot)}
                className="min-w-[88px] flex-1 items-center gap-0.5 rounded-md border border-slate-300 bg-white px-3 py-2 active:border-blue-700 active:bg-blue-50"
                style={{ flexBasis: '30%', maxWidth: '32%' }}
              >
                <Text className="text-base font-semibold text-slate-900">
                  {formatTimeInTz(slot.startAt, tenant.timezone)}
                </Text>
                {barbersInResults.length > 1 ? (
                  <Text className="text-[10px] text-slate-500" numberOfLines={1}>
                    {slot.barberName}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? 'rounded-full bg-slate-900 px-3 py-1.5'
          : 'rounded-full border border-slate-300 bg-white px-3 py-1.5'
      }
    >
      <Text
        className={
          active
            ? 'text-xs font-semibold text-white'
            : 'text-xs font-medium text-slate-700'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Placeholder Phase 3 → Phase 4 substitui pelo BookingForm.
 */
function BookingFormPlaceholder({
  tenant,
  t,
  onChange,
}: {
  tenant: PublicTenantDto;
  t: string;
  onChange: () => void;
}) {
  return (
    <View className="mt-6 mx-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
      <Text className="text-center text-sm font-medium text-slate-900">
        Horário escolhido
      </Text>
      <Text className="mt-1 text-center text-base font-bold text-slate-900">
        {formatSlotLabel(t, tenant.timezone)}
      </Text>
      <Text className="mt-2 text-center text-xs text-slate-500">
        Próxima etapa (seus dados) em construção.
      </Text>
      <Pressable onPress={onChange} className="mt-4 items-center">
        <Text className="text-sm font-medium text-blue-600 underline">
          Trocar horário
        </Text>
      </Pressable>
    </View>
  );
}

function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

