import { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, space, radius } from '../../theme';
import { SERVICES } from './mockServices';
import { ServiceCard } from './ServiceCard';
import { Header } from './Header';
import { PrimaryButton } from './PrimaryButton';

export function AgendarServicosScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const total = useMemo(
    () =>
      SERVICES.filter((s) => selected.includes(s.id)).reduce((sum, s) => {
        const net = s.discountPct
          ? s.price * (1 - s.discountPct / 100)
          : s.price;
        return sum + net;
      }, 0),
    [selected]
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <Header
        title="AGENDAR"
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={SERVICES}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.title}>O QUE VOCÊ VAI FAZER?</Text>
            <Text style={styles.subtitle}>Escolha um ou combine vários serviços</Text>
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

      <View style={styles.footer}>
        <PrimaryButton
          label="Continuar"
          disabled={selected.length === 0}
          onPress={() =>
            navigation.navigate('AgendarBarbeiro', { serviceIds: selected })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
