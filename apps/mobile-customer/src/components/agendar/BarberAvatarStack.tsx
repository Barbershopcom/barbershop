import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import type { Barber } from '../../types';

export function BarberAvatarStack({ barbers }: { barbers: Barber[] }) {
  return (
    <View style={s.stack}>
      {barbers.slice(0, 4).map((b, i) => (
        <View
          key={b.id}
          style={[
            s.av,
            {
              backgroundColor: colors.avatarColors[b.colorIndex],
              marginLeft: i === 0 ? 0 : -8,
              zIndex: 10 - i,
            },
          ]}
        >
          <Text style={s.initials}>{b.initials}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
  av: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
