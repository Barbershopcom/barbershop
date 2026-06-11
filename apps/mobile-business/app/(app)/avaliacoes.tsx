import type { RatingStats, ReviewItem } from '@barbearia/schemas';
import { MessageSquare, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

interface BarberReviewsResponse {
  stats: RatingStats;
  items: ReviewItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Linha de estrelas (preenchidas até `value`). */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color="#F59E0B"
          fill={n <= Math.round(value) ? '#F59E0B' : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

export default function AvaliacoesScreen() {
  const { state } = useSession();
  const [data, setData] = useState<BarberReviewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<BarberReviewsResponse>('/me/barber/reviews');
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar avaliações');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state.status !== 'linked') return null;

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const avg = data?.stats.avg ?? null;
  const count = data?.stats.count ?? 0;

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Avaliações"
        title="O que dizem de você"
        avatarInitial={initialsOf(state.employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="px-6 py-6 pb-12 gap-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a365d" />
        }
      >
        {/* Resumo do rating */}
        <View className="flex-row items-center gap-4 rounded-lg border border-border bg-background-muted p-5">
          <View className="items-center">
            <Text className="text-3xl font-bold text-foreground">
              {avg !== null ? avg.toFixed(1) : '—'}
            </Text>
            <Stars value={avg ?? 0} size={14} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {count === 0
                ? 'Sem avaliações ainda'
                : `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`}
            </Text>
            <Text className="text-xs text-foreground-muted">
              Clientes avaliam após cada corte concluído.
            </Text>
          </View>
        </View>

        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : data === null ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#1a365d" />
          </View>
        ) : data.items.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <MessageSquare size={28} color="#8a8073" strokeWidth={1.5} />
            <Text className="text-sm text-foreground-muted">Nenhuma avaliação por aqui.</Text>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Recentes
            </Text>
            {data.items.map((r) => (
              <View key={r.id} className="gap-2 rounded-lg border border-border bg-background p-4">
                <View className="flex-row items-center justify-between">
                  <Stars value={r.rating} />
                  <Text className="text-xs text-foreground-muted">{formatDate(r.createdAt)}</Text>
                </View>
                {r.comment ? (
                  <Text className="text-sm text-foreground">{r.comment}</Text>
                ) : null}
                <Text className="text-xs text-foreground-muted">
                  {r.customerFirstName} · {r.serviceName}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
