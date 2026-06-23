import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { Home, Search, Calendar, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { persistSlug } from '@/lib/tenant-slug';

export default function TenantTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // Persiste o slug da URL — reabrir o app sem o link mantém a barbearia fixa.
  useEffect(() => {
    if (slug) void persistSlug(slug);
  }, [slug]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a365d',
        tabBarInactiveTintColor: '#8a8073',
        tabBarStyle: {
          backgroundColor: '#fffcf5',
          borderTopColor: '#e5ddd0',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="busca"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
        listeners={{
          // A aba Buscar abre o fluxo de agendamento (stack) no tenant da URL,
          // em vez de virar uma tela vazia. Intercepta o toque e navega.
          tabPress: (e) => {
            if (slug) {
              e.preventDefault();
              router.push(`/(public)/agendamento/${encodeURIComponent(slug)}`);
            }
          },
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
