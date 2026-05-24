import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-6">
      <View className="items-center gap-2">
        <Text className="text-3xl font-bold text-slate-900">Barbearia</Text>
        <Text className="text-base text-slate-500">Agende seu corte em segundos</Text>
      </View>
      <Link
        href="/login"
        className="rounded-md bg-slate-900 px-8 py-3 text-base font-semibold text-white"
      >
        Entrar
      </Link>
    </View>
  );
}
