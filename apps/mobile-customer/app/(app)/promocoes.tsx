import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

export default function PromocoesScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">PROMOÇÕES</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 py-6">
        {/* Promo card 1 */}
        <View className="mb-4 rounded-lg bg-navy px-4 py-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase text-gold">ATÉ DOMINGO</Text>
            <Text className="text-xs font-bold uppercase text-white">30% OFF</Text>
          </View>
          <Text className="font-serif text-sm italic text-white">
            Corte + Barba • Barbearia do Jajá
          </Text>
          <Pressable className="mt-4 rounded-lg bg-white/20 py-2 active:opacity-70">
            <Text className="text-center text-xs font-bold text-white">VER BARBEARIA</Text>
          </Pressable>
        </View>

        {/* Promo card 2 */}
        <View className="mb-4 rounded-lg bg-red-600 px-4 py-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase text-white">PRIMEIRA VEZ</Text>
            <Text className="text-xs font-bold uppercase text-white">R$ 10</Text>
          </View>
          <Text className="font-serif text-sm italic text-white">
            No 1º corte • Rede Navalha
          </Text>
          <Pressable className="mt-4 rounded-lg bg-white/20 py-2 active:opacity-70">
            <Text className="text-center text-xs font-bold text-white">VER BARBEARIAS</Text>
          </Pressable>
        </View>

        {/* Empty state */}
        <View className="mt-12 items-center justify-center py-12">
          <Text className="text-center text-sm text-foreground-muted">
            Volte sempre para ver novas promoções! 🎁
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
