import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

/**
 * Stub Phase 2 — fluxo de booking. Phase 3 troca por picker
 * (react-native-calendars + chips). Phase 4 adiciona form + sucesso.
 */
export default function BookingFlow() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View className="flex-1 bg-white">
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center gap-1 px-6 pt-12"
      >
        <ChevronLeft size={16} color="#64748b" />
        <Text className="text-sm text-slate-500">Voltar</Text>
      </Pressable>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-slate-500">
          Em breve: escolha de horário e confirmação para {slug}.
        </Text>
      </View>
    </View>
  );
}
