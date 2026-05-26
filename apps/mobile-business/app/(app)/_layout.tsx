import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, House, Scissors, UserRound } from 'lucide-react-native';

import { useSession } from '@/lib/session';

const ACTIVE_COLOR = '#357BE4';
const INACTIVE_COLOR = '#727B8E';

/**
 * Tab layout — só renderiza quando user está linked.
 * Outros estados redirecionam pra raiz, que faz o routing certo.
 */
export default function AppLayout() {
  const { state } = useSession();

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
    </Tabs>
  );
}
