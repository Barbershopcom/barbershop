import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BarberAvatarStack } from './BarberAvatarStack';
import { brl } from './format';
import { colors, fonts, radius, space } from '../../theme';
import type { Service } from '../../types';

export function ServiceCard({
  service,
  selected,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
}) {
  const net = service.discountPct
    ? service.price * (1 - service.discountPct / 100)
    : service.price;

  return (
    <Pressable onPress={onToggle} style={[s.card, selected && s.cardSelected]}>
      {/* linha 1: nome (+ badge desconto) | preço à direita */}
      <View style={s.row1}>
        <View style={s.nameWrap}>
          <Text style={s.name}>{service.name}</Text>
          {service.discountPct ? <DiscountBadge pct={service.discountPct} /> : null}
        </View>
        <View style={s.priceBlock}>
          {service.discountPct ? (
            <Text style={s.priceStrike}>{brl(service.price)}</Text>
          ) : null}
          <Text style={s.price}>{brl(net)}</Text>
        </View>
      </View>

      {/* linha 2: duração */}
      <Text style={s.duration}>{service.durationMin} min</Text>

      {/* linha 3: avatares + contagem | toggle "+" */}
      <View style={s.row3}>
        <BarberAvatarStack barbers={service.barbers} />
        <Text style={s.count}>
          {service.barbers.length} {service.barbers.length === 1 ? 'faz' : 'fazem'}
        </Text>
        <View style={{ flex: 1 }} />
        <AddToggle selected={selected} onPress={onToggle} />
      </View>
    </Pressable>
  );
}

function DiscountBadge({ pct }: { pct: number }) {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>-{pct}%</Text>
    </View>
  );
}

function AddToggle({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[s.toggle, selected && s.toggleOn]}>
      <Feather
        name={selected ? 'check' : 'plus'}
        size={18}
        color={selected ? '#fff' : colors.ink}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(4),
    marginBottom: space(3),
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: '#1c1917',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardSelected: { borderColor: colors.navy, borderWidth: 1.6 },
  row1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    flexShrink: 1,
  },
  name: { fontFamily: fonts.uiBold, fontSize: 17, color: colors.ink },
  badge: {
    backgroundColor: colors.dourado,
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.uiExtra,
    fontSize: 10,
    color: colors.tinta,
    letterSpacing: 0.3,
  },
  priceBlock: { alignItems: 'flex-end' },
  priceStrike: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  duration: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: space(1),
  },
  row3: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(3),
  },
  count: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
  toggle: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.card,
  },
  toggleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
});
