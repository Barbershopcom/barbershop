import type { PublicServiceDto } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import {
  AgendarServicosScreen,
  Header,
  PrimaryButton,
  ServiceCard,
} from '@/components/agendar';
import { colors, fonts, radius, space } from '@/theme';
import type { Service, Barber } from '@/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; services: Service[] }
  | { kind: 'error'; message: string };

export default function AgendamentoServicoScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!slug || !booking.state.barbershopId) return;

    (async () => {
      try {
        const apiServices = await api.get<PublicServiceDto[]>(
          `/public/tenants/${encodeURIComponent(slug)}/services`,
        );
        // TODO: Buscar barbeiros para mapear quem faz cada serviço
        const services: Service[] = apiServices.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          price: (s.basePriceCents || 0) / 100,
          discountPct: undefined,
          barbers: [], // TODO: popular com dados reais
        }));
        setState({ kind: 'ready', services });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Erro ao carregar',
        });
      }
    })();
  }, [slug, booking.state.barbershopId]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleContinue = () => {
    if (selected.length > 0) {
      booking.selectServices(selected);
      router.push(
        `/(public)/agendamento/${encodeURIComponent(slug)}/barbeiro`,
      );
    }
  };

  if (state.kind === 'loading') {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View style={s.centerContainer}>
        <Text style={s.errorText}>{state.message}</Text>
        <PrimaryButton
          label="Voltar"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const { services } = state;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.root}>
      <Header
        title="AGENDAR"
        onBack={() => router.back()}
      />

      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.intro}>
            <Text style={s.title}>O QUE VOCÊ VAI FAZER?</Text>
            <Text style={s.subtitle}>Escolha um ou combine vários serviços</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            selected={selected.includes(item.id)}
            onToggle={() => toggle(item.id)}
          />
        )}
      />

      <View style={s.footer}>
        <PrimaryButton
          label="Continuar"
          disabled={selected.length === 0}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: space(5),
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.vermelho,
    marginBottom: space(4),
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: space(5),
    paddingBottom: space(28),
  },
  intro: { paddingTop: space(5), paddingBottom: space(4) },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.muted,
    marginTop: space(1.5),
  },
  footer: {
    paddingHorizontal: space(5),
    paddingTop: space(3),
    paddingBottom: space(2),
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
});
