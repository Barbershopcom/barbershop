import type { DiscoverItem } from '@barbearia/schemas';
import { useRouter } from 'expo-router';
import { MapPin, Scissors, Search, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';

/**
 * Home de descoberta (ADR-020 §3). Lista barbearias públicas com nota,
 * busca por nome. Deeplink por slug continua abrindo /b/[slug] direto.
 */
export default function PublicHome() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<DiscoverItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q: string) => {
    setError(null);
    try {
      const search = q.trim();
      const path = search
        ? `/public/discover?q=${encodeURIComponent(search)}`
        : '/public/discover';
      const data = await api.get<DiscoverItem[]>(path);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao buscar barbearias');
      setItems([]);
    }
  }, []);

  // Busca com debounce de 350ms ao digitar.
  useEffect(() => {
    const t = setTimeout(() => void load(query), 350);
    return () => clearTimeout(t);
  }, [query, load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-4 px-6 pb-4 pt-16">
        <View className="flex-row items-center gap-3">
          <Scissors size={28} color="#1a365d" strokeWidth={1.5} />
          <Text className="font-display text-3xl tracking-wide text-navy">NAVALHA</Text>
        </View>

        <View className="flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
          <Search size={18} color="#8a8073" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Buscar barbearia pelo nome"
            placeholderTextColor="#8a8073"
            returnKeyType="search"
            className="flex-1 py-3 text-base text-foreground"
          />
        </View>
      </View>

      {items === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a365d" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.slug}
          contentContainerClassName="px-6 pb-12 gap-3"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a365d" />
          }
          renderItem={({ item }) => (
            <BarbershopCard
              item={item}
              onPress={() => router.push(`/b/${encodeURIComponent(item.slug)}/agendar`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center gap-2 py-16">
              <Scissors size={32} color="#c5a059" strokeWidth={1.5} />
              <Text className="text-center font-serif text-sm italic text-foreground-muted">
                {error
                  ? error
                  : query.trim()
                    ? 'Nenhuma barbearia encontrada para essa busca.'
                    : 'Nenhuma barbearia disponível ainda.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <Pressable onPress={() => router.push('/login')} className="mt-6 items-center">
              <Text className="text-sm text-foreground-muted underline">
                Já é cliente? Entrar e ver histórico
              </Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

function formatPriceBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function BarbershopCard({ item, onPress }: { item: DiscoverItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="gap-2 rounded-lg border border-border bg-card p-4 active:opacity-70"
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-base font-semibold text-foreground">{item.name}</Text>
        {item.ratingCount > 0 && item.ratingAvg !== null ? (
          <View className="flex-row items-center gap-1">
            <Star size={14} color="#c5a059" fill="#c5a059" />
            <Text className="text-sm font-medium text-foreground">
              {item.ratingAvg.toFixed(1)}
            </Text>
            <Text className="text-xs text-foreground-muted">({item.ratingCount})</Text>
          </View>
        ) : (
          <Text className="text-xs text-foreground-muted">Sem avaliações</Text>
        )}
      </View>

      {item.addressLine ? (
        <View className="flex-row items-center gap-1.5">
          <MapPin size={13} color="#8a8073" />
          <Text className="flex-1 font-serif text-xs italic text-foreground-muted" numberOfLines={1}>
            {item.addressLine}
          </Text>
        </View>
      ) : null}

      {item.priceFromCents !== null ? (
        <Text className="text-xs text-foreground-muted">
          A partir de{' '}
          <Text className="font-semibold text-foreground">
            {formatPriceBRL(item.priceFromCents)}
          </Text>
        </Text>
      ) : null}
    </Pressable>
  );
}
