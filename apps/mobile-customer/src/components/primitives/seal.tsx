import { View, Text } from 'react-native';

/** NAVALHA seal: barber pole em círculo. Versão mobile simplificada. */
export function Seal({ size = 48 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1a365d',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#bf212f',
      }}
    >
      <Text style={{ fontSize: size * 0.5, fontWeight: 'bold', color: '#bf212f' }}>⚔️</Text>
    </View>
  );
}
