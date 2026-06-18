import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BarberPoleMark } from './BarberPoleMark';
import { colors, fonts, radius, space } from '../../theme';

export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.bar}>
      <Pressable onPress={onBack} hitSlop={10} style={s.iconBtn}>
        <Feather name="chevron-left" size={20} color={colors.ink} />
      </Pressable>
      <Text style={s.title}>{title}</Text>
      <BarberPoleMark />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.bg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.ink,
  },
});
