import type { PublicServiceDto, PublicTenantDto } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Circle, Instagram, MapPin, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { formatDurationLabel, formatPriceBRL } from '@/lib/format';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; tenant: PublicTenantDto; services: PublicServiceDto[] }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export default function TenantLanding() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const [tenant, services] = await Promise.all([
          api.get<PublicTenantDto>(`/public/tenants/${encodeURIComponent(slug)}`),
          api.get<PublicServiceDto[]>(`/public/tenants/${encodeURIComponent(slug)}/services`),
        ]);
        if (!cancelled) setState({ kind: 'ready', tenant, services });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not_found' });
        } else {
          setState({
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
  }, [slug]);

  const toggleService = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selected.size === 0) return;
    const { tenant } = state.kind === 'ready' ? state : { tenant: null };
    if (!tenant) return;
    const serviceIds = Array.from(selected).join(',');
    router.push(
      `/b/${encodeURIComponent(tenant.slug)}/agendar?s=${encodeURIComponent(serviceIds)}`,
    );
  };

  if (state.kind === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="font-display text-2xl uppercase tracking-wide text-foreground">
          Barbearia não encontrada
        </Text>
        <Text className="text-center font-serif text-sm italic text-foreground-muted">
          Confirme o nome com quem te enviou o link.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-sm font-medium text-navy underline">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="text-base text-destructive">{state.message}</Text>
        <Pressable
          onPress={() => router.replace(`/b/${encodeURIComponent(slug)}`)}
          className="mt-2 rounded-md bg-navy px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  if (state.kind !== 'ready') return null;
  const { tenant, services } = state;
  const hasContact = tenant.phoneE164 || tenant.addressLine || tenant.instagramHandle;
  const totalPrice = Array.from(selected)
    .map((id) => services.find((s) => s.id === id)?.basePriceCents ?? 0)
    .reduce((a, b) => a + b, 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pb-4 pt-8">
          <Text className="font-display text-4xl uppercase tracking-wide text-navy">
            {tenant.name}
          </Text>
          <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
            Selecione um ou mais serviços.
          </Text>
        </View>

        {hasContact ? (
          <View className="mx-6 mb-4 gap-2 rounded-lg border border-border bg-card p-4">
            {tenant.addressLine ? (
              <View className="flex-row items-center gap-2">
                <MapPin size={14} color="#c5a059" />
                <Text className="flex-1 text-sm text-foreground-muted">{tenant.addressLine}</Text>
              </View>
            ) : null}
            {tenant.instagramHandle ? (
              <Pressable
                onPress={() =>
                  void Linking.openURL(`https://instagram.com/${tenant.instagramHandle}`)
                }
                className="flex-row items-center gap-2 active:opacity-70"
              >
                <Instagram size={14} color="#c5a059" />
                <Text className="text-sm text-foreground-muted">@{tenant.instagramHandle}</Text>
              </Pressable>
            ) : null}
            {tenant.phoneE164 ? (
              <Pressable
                onPress={() => void Linking.openURL(buildWhatsAppLink(tenant.phoneE164!, tenant.name))}
                className="mt-1 flex-row items-center justify-center gap-2 rounded-md bg-emerald-600 py-2 active:opacity-80"
              >
                <MessageCircle size={16} color="white" />
                <Text className="text-sm font-semibold text-white">WhatsApp</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {services.length === 0 ? (
          <View className="mx-6 rounded-lg border border-dashed border-border bg-background-muted p-6">
            <Text className="text-center font-serif text-sm italic text-foreground-muted">
              Esta barbearia ainda não tem serviços.
            </Text>
          </View>
        ) : (
          <View className="gap-2 px-6">
            {services.map((s: PublicServiceDto) => {
              const isSelected = selected.has(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleService(s.id)}
                  className={`flex-row items-center gap-3 rounded-lg border p-4 ${
                    isSelected
                      ? 'border-navy bg-blue-50'
                      : 'border-border bg-card active:opacity-70'
                  }`}
                >
                  <View className="pt-1">
                    {isSelected ? (
                      <CheckCircle2 size={20} color="#1a365d" />
                    ) : (
                      <Circle size={20} color="#8a8073" strokeWidth={1.5} />
                    )}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className={`text-base font-semibold ${isSelected ? 'text-navy' : 'text-foreground'}`}>
                      {s.name}
                    </Text>
                    {s.description ? (
                      <Text className="text-xs text-foreground-muted" numberOfLines={2}>
                        {s.description}
                      </Text>
                    ) : null}
                    <Text className="font-serif text-xs italic text-foreground-muted">
                      {formatDurationLabel(s.durationMin)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-navy">
                      {formatPriceBRL(s.basePriceCents)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {services.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 gap-3 border-t border-border bg-background px-6 py-4">
          {selected.size > 0 ? (
            <View className="flex-row items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <View>
                <Text className="text-xs font-semibold uppercase text-foreground-muted">
                  {selected.size} serviço{selected.size !== 1 ? 's' : ''} selecionado
                </Text>
                <Text className="font-display text-lg font-bold text-navy">{formatPriceBRL(totalPrice)}</Text>
              </View>
            </View>
          ) : null}
          <Pressable
            onPress={handleContinue}
            disabled={selected.size === 0}
            className={`items-center justify-center rounded-md py-4 ${
              selected.size === 0 ? 'bg-foreground-muted opacity-50' : 'bg-navy'
            }`}
          >
            <Text className="font-display text-base font-bold text-white">
              {selected.size === 0 ? 'Selecione um serviço' : 'Continuar'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function buildWhatsAppLink(phoneE164: string, tenantName: string): string {
  const digits = phoneE164.replace(/^\+/, '');
  const text = encodeURIComponent(
    `Olá, ${tenantName}! Vim pelo app e gostaria de agendar.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}
