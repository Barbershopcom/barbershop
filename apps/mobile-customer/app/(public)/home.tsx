import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { api, type ApiError } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import { formatPriceBRL } from '@/lib/format';

interface DiscoverItem {
  id: string;
  slug: string;
  name: string;
  ratingAvg: number | null;
  ratingCount: number;
  addressLine: string | null;
  neighborhood: string | null;
  priceFromCents: number | null;
  employeeCount: number;
  hasPromotion: boolean;
}

interface PromotionDto {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  tenantSlug: string;
  tenantName: string;
  validUntil: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: barbershops, isLoading, error: barbershopsError } = useQuery<DiscoverItem[]>({
    queryFn: async () => {
      const res = await api.get<DiscoverItem[]>('/public/discover');
      return res;
    },
  });

  const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useQuery<PromotionDto[]>({
    queryFn: async () => {
      const res = await api.get<PromotionDto[]>('/public/promotions');
      return res;
    },
  });

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        barbershops ? api.get<DiscoverItem[]>('/public/discover') : Promise.resolve([]),
        promotions ? api.get<PromotionDto[]>('/public/promotions') : Promise.resolve([]),
      ]);
    } catch (err) {
    } finally {
      setIsRefreshing(false);
    }
  }

  const userName = useMemo(() => {
    if (state.status === 'authenticated' && state.session?.user?.email) {
      const email = state.session.user.email;
      const parts = email.split('@');
      const name = parts[0];
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Cliente';
    }
    return 'Visitante';
  }, [state]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
      scrollIndicatorInsets={{ right: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#1a365d"
        />
      }
    >
      {/* Header */}
      <View className="px-6 pt-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="mb-8 flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-wide text-foreground-muted">Bem-vindo,</Text>
            <Text className="font-display text-xl font-bold uppercase text-foreground">
              {userName}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(public)/notificacoes')} className="p-2">
            <Bell size={24} color="#1a365d" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable
          onPress={() => router.push('/(public)/busca')}
          className="mb-8 flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <Search size={18} color="#8a8073" />
          <TextInput
            placeholder="Buscar barbearia ou serviço..."
            placeholderTextColor="#8a8073"
            editable={false}
            className="flex-1 text-base text-foreground"
          />
        </Pressable>
      </View>

      {/* Promoções da semana */}
      {!promotionsLoading && promotions && promotions.length > 0 && (
        <View className="px-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-display text-lg font-bold uppercase text-foreground">
              Promoções da semana
            </Text>
            <Pressable onPress={() => router.push('/(public)/promocoes')}>
              <Text className="text-xs font-semibold text-navy">Ver tudo →</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-8"
            contentContainerClassName="gap-3"
          >
            {promotions.slice(0, 3).map((promo) => {
              const discountLabel =
                promo.discountType === 'percent'
                  ? `${(promo.discountValue / 100).toFixed(0)}% OFF`
                  : `${formatPriceBRL(promo.discountValue)} OFF`;

              return (
                <Pressable
                  key={promo.id}
                  onPress={() =>
                    router.push(`/(public)/b/${encodeURIComponent(promo.tenantSlug)}`)
                  }
                  className="w-48 rounded-lg bg-navy px-4 py-6 active:opacity-80"
                >
                  <Text className="mb-2 text-xs font-bold uppercase text-gold">
                    {promo.validUntil
                      ? `ATÉ ${new Date(promo.validUntil).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }).toUpperCase()}`
                      : 'OFERTA ESPECIAL'}
                  </Text>
                  <Text className="font-display text-3xl font-bold text-white">
                    {discountLabel}
                  </Text>
                  <Text className="mt-1 font-serif text-sm italic text-white">
                    {promo.name}
                  </Text>
                  <Text className="mt-2 text-xs text-white/80">{promo.tenantName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Placeholder quando não há promoções */}
      {!promotionsLoading && (!promotions || promotions.length === 0) && (
        <View className="px-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-display text-lg font-bold uppercase text-foreground">
              Promoções da semana
            </Text>
          </View>
          <View className="mb-8 rounded-lg bg-card p-4">
            <Text className="text-center text-sm text-foreground-muted">
              Nenhuma promoção disponível no momento
            </Text>
          </View>
        </View>
      )}

      {/* Seus agendamentos */}
      {state.status === 'authenticated' && (
        <View className="px-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-display text-lg font-bold uppercase text-foreground">
              Seus agendamentos
            </Text>
            <Pressable onPress={() => router.push('/(main)/agenda')}>
              <Text className="text-xs font-semibold text-navy">Ver todos →</Text>
            </Pressable>
          </View>
          <View className="mb-8 rounded-lg border border-border bg-card p-4">
            <Text className="text-center text-sm text-foreground-muted">
              Nenhum agendamento próximo
            </Text>
          </View>
        </View>
      )}

      {/* Barbeiros em destaque */}
      <View className="px-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-display text-lg font-bold uppercase text-foreground">
            Barbeiros em destaque
          </Text>
        </View>

        {isLoading ? (
          <View className="py-8">
            <ActivityIndicator color="#1a365d" />
          </View>
        ) : barbershops && barbershops.length > 0 ? (
          <View className="gap-3">
            {barbershops.slice(0, 5).map((shop: DiscoverItem) => (
              <Pressable
                key={shop.id}
                onPress={() => router.push(`/(public)/b/${shop.slug}`)}
                className="rounded-lg border border-border bg-card p-4"
              >
                <View className="flex-row items-start gap-3">
                  <View className="h-16 w-16 items-center justify-center rounded-lg bg-navy">
                    <Text className="font-bold text-white">
                      {shop.name
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-foreground">{shop.name}</Text>
                      {shop.hasPromotion && (
                        <View className="rounded-full bg-gold px-2 py-1">
                          <Text className="text-xs font-bold text-navy">PROMO</Text>
                        </View>
                      )}
                    </View>
                    <View className="mt-1 flex-row items-center gap-2">
                      {shop.ratingAvg ? (
                        <>
                          <Text className="text-xs text-gold">⭐ {shop.ratingAvg.toFixed(1)}</Text>
                          <Text className="text-xs text-foreground-muted">
                            ({shop.ratingCount})
                          </Text>
                        </>
                      ) : (
                        <Text className="text-xs text-foreground-muted">Sem avaliações</Text>
                      )}
                    </View>
                    {shop.neighborhood && (
                      <Text className="mt-1 text-xs text-foreground-muted">
                        {shop.neighborhood} • {shop.employeeCount} barbeiros
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="text-center text-sm text-foreground-muted">
            Nenhuma barbearia disponível
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
