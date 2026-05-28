import { Text, View } from 'react-native';

/**
 * Histórico de agendamentos. Phase 5 vai implementar fetch
 * /me/appointments + lista + cancel inline.
 */
export default function MyAppointmentsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-base text-slate-500">
        Em breve: seus agendamentos.
      </Text>
    </View>
  );
}
