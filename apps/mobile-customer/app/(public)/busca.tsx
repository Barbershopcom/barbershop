import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';

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

export default function SearchScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState<'proximidade' | 'avaliadas' | 'promocoes'>(
    'proximidade',
  );

  const { data: allBarbershops = [], isLoading } = useQuery<DiscoverItem[]>({
    queryFn: async () => {
      const res = await api.get<DiscoverItem[]>('/public/discover');
      return res;
    },
  });

  const filtered = useMemo(() => {
    let results = allBarbershops;

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      results = results.filter(
        (shop: DiscoverItem) =>
          shop.name.toLowerCase().includes(query) ||
          shop.slug.toLowerCase().includes(query) ||
          shop.neighborhood?.toLowerCase().includes(query),
      );
    }

    if (filterTab === 'avaliadas') {
      results = results.sort((a: DiscoverItem, b: DiscoverItem) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
    } else if (filterTab === 'promocoes') {
      results = results.filter((shop: DiscoverItem) => shop.hasPromotion);
    }

    return results;
  }, [allBarbershops, searchText, filterTab]);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nome da barbearia ou bairro"
            placeholderTextColor="#8a8073"
            autoFocus
            className="flex-1 rounded-lg bg-background px-3 py-2 text-base text-foreground"
          />
        </View>
      </View>

      {/* Filtros */}
      <View className="border-b border-border px-4 py-3">
        <View className="flex-row gap-2">
          {(['proximidade', 'avaliadas', 'promocoes'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setFilterTab(tab)}
              className={`rounded-full px-4 py-2 ${
                filterTab === tab ? 'bg-navy' : 'border border-border bg-background'
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase ${
                  filterTab === tab ? 'text-white' : 'text-foreground'
                }`}
              >
                {tab === 'proximidade' ? 'Próximas' : tab === 'avaliadas' ? 'Mais avaliadas' : 'Promoções'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a365d" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-4 gap-3"
          renderItem={({ item: shop }) => (
            <Pressable
              onPress={() => router.push(`/(public)/b/${shop.slug}`)}
              className="rounded-lg border border-border bg-card p-4 active:bg-blue-50"
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
                  <View className="mt-2 flex-row items-center gap-2">
                    {shop.ratingAvg ? (
                      <>
                        <Text className="text-xs text-gold">⭐ {shop.ratingAvg.toFixed(1)}</Text>
                        <Text className="text-xs text-foreground-muted">({shop.ratingCount})</Text>
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
                  <View className="mt-2 flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-green-500" />
                    <Text className="text-xs font-semibold text-green-500">Aberta agora</Text>
                  </View>
                </View>
                <Text className="text-lg text-foreground-muted">›</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-center text-sm text-foreground-muted">
                {searchText ? 'Nenhuma barbearia encontrada' : 'Comece a buscar'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
