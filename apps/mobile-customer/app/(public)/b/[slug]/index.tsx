import type { PublicServiceDto, PublicTenantDto } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Instagram,
  MapPin,
  MessageCircle,
  Share2,
  Star,
} from 'lucide-react-native';
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
import { useBooking } from '@/lib/booking-context';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; tenant: PublicTenantDto; services: PublicServiceDto[] }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

type Tab = 'servicos' | 'barbeiros' | 'avaliacoes' | 'info';

export default function BarbershopDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [activeTab, setActiveTab] = useState<Tab>('servicos');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const [tenant, services] = await Promise.all([
          api.get<PublicTenantDto>(`/public/tenants/${encodeURIComponent(slug)}`),
          api.get<PublicServiceDto[]>(
            `/public/tenants/${encodeURIComponent(slug)}/services`,
          ),
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
    if (selected.size === 0 || state.kind !== 'ready') return;
    const { tenant, services } = state;
    booking.setBarbershop(tenant.id, tenant.name, tenant.slug);
    // Armazenar todos os serviços disponíveis no contexto
    booking.setAvailableServices(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        basePriceCents: s.basePriceCents,
        durationMin: s.durationMin,
      })),
    );
    // Selecionar os serviços escolhidos
    Array.from(selected).forEach((serviceId) => {
      booking.toggleService(serviceId);
    });
    router.push(`/(public)/agendamento/${encodeURIComponent(tenant.slug)}`);
  };

  if (state.kind === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  if (state.kind === 'not_found' || state.kind === 'error' || state.kind !== 'ready') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="font-display text-xl uppercase tracking-wide text-foreground">
          {state.kind === 'not_found' ? 'Não encontrada' : 'Erro'}
        </Text>
        <Text className="text-center text-sm text-foreground-muted">
          {state.kind === 'error' ? state.message : 'Confirme o nome com quem te enviou.'}
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-md bg-navy px-6 py-2">
          <Text className="text-sm font-semibold text-white">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const { tenant, services } = state;
  const totalPrice = Array.from(selected)
    .map((id) => services.find((s) => s.id === id)?.basePriceCents ?? 0)
    .reduce((a, b) => a + b, 0);

  return (
    <View className="flex-1 bg-background">
      {/* Header com banner */}
      <View className="bg-gradient-to-b from-navy/10 to-background pb-6 pt-2">
        <View className="flex-row items-center justify-between px-6 py-3">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Pressable className="p-2">
            <Share2 size={24} color="#1a365d" />
          </Pressable>
        </View>

        <View className="px-6">
          <View className="mb-3 flex-row items-center gap-2">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-navy">
              <Text className="font-bold text-white">
                {tenant.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-display text-lg font-bold uppercase text-foreground">
                {tenant.name}
              </Text>
              <View className="flex-row items-center gap-1">
                {tenant.ratingAvg ? (
                  <>
                    <Star size={12} color="#c5a059" fill="#c5a059" />
                    <Text className="text-xs text-foreground-muted">
                      {tenant.ratingAvg.toFixed(1)} ({tenant.ratingCount})
                    </Text>
                  </>
                ) : (
                  <Text className="text-xs text-foreground-muted">Sem avaliações</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border bg-background px-6">
        {(['servicos', 'barbeiros', 'avaliacoes', 'info'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 border-b-2 py-4 ${
              activeTab === tab ? 'border-navy' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-center text-xs font-semibold uppercase ${
                activeTab === tab ? 'text-navy' : 'text-foreground-muted'
              }`}
            >
              {tab === 'servicos'
                ? 'Serviços'
                : tab === 'barbeiros'
                  ? 'Barbeiros'
                  : tab === 'avaliacoes'
                    ? 'Avaliações'
                    : 'Info'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Conteúdo */}
      <ScrollView contentContainerClassName="pb-32 px-6 py-4">
        {activeTab === 'servicos' && (
          <View className="gap-3">
            {services.length === 0 ? (
              <Text className="text-center text-sm text-foreground-muted">
                Nenhum serviço disponível
              </Text>
            ) : (
              services.map((s: PublicServiceDto) => {
                const isSelected = selected.has(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleService(s.id)}
                    className={`flex-row items-center gap-3 rounded-lg border p-4 ${
                      isSelected ? 'border-navy bg-blue-50' : 'border-border bg-card'
                    }`}
                  >
                    <View>
                      {isSelected ? (
                        <CheckCircle2 size={20} color="#1a365d" />
                      ) : (
                        <Circle size={20} color="#8a8073" strokeWidth={1.5} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{s.name}</Text>
                      <Text className="text-xs text-foreground-muted">
                        {formatDurationLabel(s.durationMin)}
                      </Text>
                    </View>
                    <Text className="font-bold text-navy">{formatPriceBRL(s.basePriceCents)}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'barbeiros' && (
          <View>
            <Text className="text-center text-sm text-foreground-muted">
              Selecione os serviços primeiro
            </Text>
          </View>
        )}

        {activeTab === 'avaliacoes' && (
          <View>
            <View className="items-center gap-3 rounded-lg bg-card p-6">
              <View className="flex-row items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    color="#c5a059"
                    fill={i < Math.floor(tenant.ratingAvg ?? 0) ? '#c5a059' : 'none'}
                  />
                ))}
              </View>
              <Text className="font-display text-3xl font-bold text-navy">
                {tenant.ratingAvg?.toFixed(1) ?? '—'}
              </Text>
              <Text className="text-xs text-foreground-muted">
                {tenant.ratingCount} avaliações
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'info' && (
          <View className="gap-3">
            {tenant.addressLine && (
              <View className="flex-row gap-3 rounded-lg bg-card p-4">
                <MapPin size={20} color="#1a365d" />
                <Text className="flex-1 text-sm text-foreground">{tenant.addressLine}</Text>
              </View>
            )}
            {tenant.instagramHandle && (
              <Pressable
                onPress={() =>
                  void Linking.openURL(`https://instagram.com/${tenant.instagramHandle}`)
                }
                className="flex-row gap-3 rounded-lg bg-card p-4 active:opacity-70"
              >
                <Instagram size={20} color="#1a365d" />
                <Text className="flex-1 text-sm text-foreground">
                  @{tenant.instagramHandle}
                </Text>
              </Pressable>
            )}
            {tenant.phoneE164 && (
              <Pressable
                onPress={() =>
                  void Linking.openURL(buildWhatsAppLink(tenant.phoneE164!, tenant.name))
                }
                className="flex-row gap-3 rounded-lg bg-emerald-50 p-4 active:opacity-70"
              >
                <MessageCircle size={20} color="#10b981" />
                <Text className="flex-1 text-sm font-medium text-emerald-700">
                  Chamar no WhatsApp
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer com CTA */}
      {services.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
          {selected.size > 0 && (
            <View className="mb-3 flex-row items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <View>
                <Text className="text-xs font-semibold uppercase text-foreground-muted">
                  {selected.size} serviço{selected.size !== 1 ? 's' : ''}
                </Text>
                <Text className="font-display text-lg font-bold text-navy">
                  {formatPriceBRL(totalPrice)}
                </Text>
              </View>
            </View>
          )}
          <Pressable
            onPress={handleContinue}
            disabled={selected.size === 0}
            className={`items-center justify-center rounded-lg py-4 ${
              selected.size === 0
                ? 'bg-foreground-muted/30'
                : 'bg-navy active:opacity-80'
            }`}
          >
            <Text className="font-display text-base font-bold text-white">
              {selected.size === 0 ? 'Selecione um serviço' : 'Agendar'}
            </Text>
          </Pressable>
        </View>
      )}
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
