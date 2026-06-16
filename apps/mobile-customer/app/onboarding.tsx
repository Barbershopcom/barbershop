import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Seal } from '@/components/primitives/seal';

const slides = [
  {
    title: 'BEM-VINDO À NAVALHA',
    subtitle: 'Seus cortes na hora certa',
    icon: '✂️',
  },
  {
    title: 'ENCONTRE BARBEARIAS',
    subtitle: 'Descubra as melhores perto de você',
    icon: '📍',
  },
  {
    title: 'AGENDE COM FACILIDADE',
    subtitle: 'Escolha o barbeiro, dia e hora',
    icon: '📅',
  },
  {
    title: 'PAGUE RÁPIDO',
    subtitle: 'Pix aprovado na hora',
    icon: '💳',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = async () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Marcar onboarding como completo
      await AsyncStorage.setItem('onboarding_done', 'true');
      router.replace('/(auth)/login');
    }
  };

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide]!;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 items-center justify-center px-6">
        {/* Slide atual */}
        <View className="items-center gap-8">
          <Text className="text-6xl">{slide.icon}</Text>

          <View className="items-center gap-3">
            <Text className="font-display text-3xl font-bold uppercase text-navy text-center">
              {slide.title}
            </Text>
            <Text className="text-center font-serif text-sm italic text-foreground-muted">
              {slide.subtitle}
            </Text>
          </View>

          {/* Indicadores de slide */}
          <View className="flex-row gap-2">
            {slides.map((_, i) => (
              <View
                key={i}
                className={`h-2 rounded-full ${
                  i === currentSlide ? 'w-8 bg-navy' : 'w-2 bg-border'
                }`}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer com botões */}
      <View className="border-t border-border bg-background px-6 py-6">
        <Pressable
          onPress={handleNext}
          className="flex-row items-center justify-center gap-2 rounded-lg bg-navy py-4 active:opacity-80"
        >
          <Text className="font-display font-bold text-white">
            {isLastSlide ? 'COMEÇAR' : 'PRÓXIMO'}
          </Text>
          <ChevronRight size={20} color="white" />
        </Pressable>

        {!isLastSlide && (
          <Pressable
            onPress={async () => {
              await AsyncStorage.setItem('onboarding_done', 'true');
              router.replace('/(auth)/login');
            }}
            className="mt-3 items-center py-3"
          >
            <Text className="text-sm font-semibold text-navy">Pular</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
