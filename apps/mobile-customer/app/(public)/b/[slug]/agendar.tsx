import {
  type BookedAppointment,
  type CouponValidationResult,
  couponReasonLabel,
  type PublicServiceDto,
  type PublicTenantDto,
  type Slot,
  type SlotsResponse,
} from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Tag, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import { api, ApiError } from '@/lib/api';
import {
  formatDurationLabel,
  formatPriceBRL,
  formatTimeInTz,
  toE164,
} from '@/lib/format';
import { registerForPushNotificationsAsync } from '@/lib/push';
import { generateUuid } from '@/lib/uuid';

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
        <BookingForm
          tenant={tenant}
          service={service}
          startAtIso={t}
          barberId={barberId}
          onChange={() =>
            router.replace(`/b/${encodeURIComponent(slug)}/agendar?s=${encodeURIComponent(service.id)}`)
          }
          onSuccess={(booked) =>
            router.replace({
              pathname: `/b/${encodeURIComponent(slug)}/sucesso`,
              params: {
                id: booked.id,
                tz: tenant.timezone,
                tenantName: tenant.name,
                tenantSlug: tenant.slug,
                serviceName: service.name,
                startAt: booked.startAt,
                customerName: booked.customerName,
                customerEmail: booked.customerEmail ?? '',
              },
            })
          }
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

interface BookingFormProps {
  tenant: PublicTenantDto;
  service: PublicServiceDto;
  startAtIso: string;
  barberId: string;
  onChange: () => void;
  onSuccess: (booked: BookedAppointment) => void;
}

/**
 * Form do cliente (nome, telefone, email opcional) + POST do booking.
 * Idempotency-Key persiste em ref (re-submit no mesmo ciclo de vida
 * usa a mesma key); fechar e reabrir gera nova.
 */
function BookingForm({
  tenant,
  service,
  startAtIso,
  barberId,
  onChange,
  onSuccess,
}: BookingFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idemKeyRef = useRef<string | null>(null);

  // Cupom (ADR-021 §5). `applied` guarda o resultado validado + o código.
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [applied, setApplied] = useState<
    (CouponValidationResult & { code: string }) | null
  >(null);

  function getIdemKey(): string {
    if (!idemKeyRef.current) idemKeyRef.current = generateUuid();
    return idemKeyRef.current;
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (code.length < 3) {
      setCouponMsg('Código inválido.');
      return;
    }
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await api.post<CouponValidationResult>(
        `/public/tenants/${encodeURIComponent(tenant.slug)}/coupons/validate`,
        { code, serviceId: service.id },
      );
      if (res.valid) {
        setApplied({ ...res, code });
        setCouponMsg(null);
      } else {
        setApplied(null);
        setCouponMsg(res.reason ? couponReasonLabel(res.reason) : 'Cupom inválido.');
      }
    } catch (err) {
      setApplied(null);
      setCouponMsg(err instanceof ApiError ? err.message : 'Erro ao validar cupom.');
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput('');
    setCouponMsg(null);
  }

  async function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setError('Telefone inválido. Ex: (11) 99999-9999.');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email inválido.');
      return;
    }

    setBusy(true);
    try {
      // Tenta registrar push token (best-effort — null se sem permissão
      // ou em simulator). Permission prompt aparece na primeira reserva.
      const expoPushToken = await registerForPushNotificationsAsync();

      const booked = await api.post<BookedAppointment>(
        `/public/tenants/${encodeURIComponent(tenant.slug)}/appointments`,
        {
          serviceId: service.id,
          barberId,
          startAt: startAtIso,
          customerName: trimmedName,
          customerPhone: e164,
          customerEmail: trimmedEmail || undefined,
          expoPushToken: expoPushToken ?? undefined,
          couponCode: applied?.code,
        },
        { idempotencyKey: getIdemKey() },
      );
      onSuccess(booked);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Esse horário acabou de ser reservado. Escolha outro.');
      } else if (err instanceof ApiError && err.status === 422) {
        // Cupom pode ter expirado/esgotado entre validar e confirmar.
        setApplied(null);
        setError(err.message);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Erro de rede.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="mt-6 px-6"
    >
      <View className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Text className="text-xs uppercase tracking-widest text-slate-400">
          Horário escolhido
        </Text>
        <Text className="mt-1 text-base font-bold text-slate-900">
          {formatSlotLabel(startAtIso, tenant.timezone)}
        </Text>
      </View>

      <View className="mt-4 gap-3">
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">Seu nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="João da Silva"
            placeholderTextColor="#94a3b8"
            editable={!busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">
            Telefone (WhatsApp)
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            placeholderTextColor="#94a3b8"
            editable={!busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">
            Email <Text className="text-xs text-slate-400">(opcional)</Text>
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="voce@email.com"
            placeholderTextColor="#94a3b8"
            editable={!busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900"
          />
        </View>

        {/* Cupom de desconto */}
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-slate-700">
            Cupom <Text className="text-xs text-slate-400">(opcional)</Text>
          </Text>
          {applied ? (
            <View className="flex-row items-center justify-between rounded-md border border-green-300 bg-green-50 px-3 py-2.5">
              <View className="flex-row items-center gap-2">
                <Tag size={16} color="#15803d" />
                <Text className="text-sm font-semibold text-green-800">{applied.code}</Text>
              </View>
              <Pressable
                onPress={removeCoupon}
                disabled={busy}
                hitSlop={8}
                accessibilityLabel="Remover cupom"
              >
                <X size={16} color="#15803d" />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <TextInput
                value={couponInput}
                onChangeText={(v) => setCouponInput(v.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="DESCONTO10"
                placeholderTextColor="#94a3b8"
                editable={!busy && !couponBusy}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900"
              />
              <Pressable
                onPress={applyCoupon}
                disabled={busy || couponBusy}
                className="items-center justify-center rounded-md border border-slate-900 px-4 disabled:opacity-50"
              >
                {couponBusy ? (
                  <ActivityIndicator color="#0f172a" size="small" />
                ) : (
                  <Text className="text-sm font-semibold text-slate-900">Aplicar</Text>
                )}
              </Pressable>
            </View>
          )}
          {couponMsg ? <Text className="text-xs text-red-600">{couponMsg}</Text> : null}
        </View>

        {/* Resumo de preço */}
        <View className="gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Serviço</Text>
            <Text className="text-sm text-slate-700">
              {formatPriceBRL(service.basePriceCents)}
            </Text>
          </View>
          {applied && applied.discountCents ? (
            <View className="flex-row justify-between">
              <Text className="text-sm text-green-700">Desconto</Text>
              <Text className="text-sm text-green-700">
                -{formatPriceBRL(applied.discountCents)}
              </Text>
            </View>
          ) : null}
          <View className="mt-0.5 flex-row justify-between border-t border-slate-200 pt-1.5">
            <Text className="text-sm font-semibold text-slate-900">Total</Text>
            <Text className="text-base font-bold text-slate-900">
              {formatPriceBRL(
                applied?.finalPriceCents ?? service.basePriceCents,
              )}
            </Text>
          </View>
        </View>

        {error ? (
          <View className="rounded-md bg-red-50 px-3 py-2">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={busy}
          className="mt-2 items-center justify-center rounded-md bg-slate-900 px-4 py-3 disabled:opacity-60"
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Confirmar agendamento
            </Text>
          )}
        </Pressable>

        <Pressable onPress={onChange} disabled={busy} className="mt-1 items-center">
          <Text className="text-sm text-slate-500">Trocar horário</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

