import { Redirect, Tabs } from 'expo-router';
import { BellRing, CalendarDays, House, Scissors, UserRound } from 'lucide-react-native';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import { registerForPushNotificationsAsync } from '@/lib/push';
import { useSession } from '@/lib/session';

const ACTIVE_COLOR = '#357BE4';
const INACTIVE_COLOR = '#727B8E';

/**
 * Tab layout — só renderiza quando user está linked.
 * Outros estados redirecionam pra raiz, que faz o routing certo.
 */
export default function AppLayout() {
  const { state } = useSession();
  const linked = state.status === 'linked';

  // Registra device push do barbeiro ao logar (ADR-017 §6). Best-effort.
  useEffect(() => {
    if (!linked) return;
    void (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      try {
        await api.post('/me/devices', { expoPushToken: token });
      } catch {
        // best-effort — barbeiro ainda vê pendentes na lista
      }
    })();
  }, [linked]);

  if (state.status !== 'linked') {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECEDF0',
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pendentes"
        options={{
          title: 'Pendentes',
          tabBarIcon: ({ color, size }) => <BellRing size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => <Scissors size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserRound size={size} color={color} />,
        }}
      />
      {/* Acessíveis via menu em Início, fora da barra de tabs. */}
      <Tabs.Screen name="folgas" options={{ href: null }} />
      <Tabs.Screen name="avaliacoes" options={{ href: null }} />
    </Tabs>
  );
}
