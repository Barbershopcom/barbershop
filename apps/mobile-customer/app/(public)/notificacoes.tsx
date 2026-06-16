import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Clock, Heart, Clock3, Zap, MessageCircle } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificacoesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const notifications = [
    {
      id: '1',
      type: 'confirmation',
      title: 'Jajá confirmou seu horário',
      message: 'Corte + Barba — sáb 17 mai, 14:00. Te esperamos!',
      time: 'há 12 min',
      icon: '✓',
      color: '#10B981',
    },
    {
      id: '2',
      type: 'promo',
      title: '30% OFF em Corte + Barba',
      message: 'Promo da Barbearia do Jajá, válida até domingo.',
      time: 'há 3 horas',
      icon: '❤️',
      color: '#EF4444',
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Seu corte é amanhã',
      message: 'Lembrete: sáb 17 mai às 14:00 com o Jajá.',
      time: 'ontem • 19:30',
      icon: '⏰',
      color: '#F59E0B',
    },
    {
      id: '4',
      type: 'payment',
      title: 'Pagamento confirmado',
      message: 'Recebemos seu Pix de R$ 76,00. Comanda 0427.',
      time: 'ontem • 14:33',
      icon: '💳',
      color: '#8B5CF6',
    },
    {
      id: '5',
      type: 'reminder2',
      title: 'Como foi seu corte?',
      message: 'Avalie seu atendimento de 02 mai e ajude o Jajá.',
      time: 'ter • 11:20',
      icon: '⭐',
      color: '#F59E0B',
    },
    {
      id: '6',
      type: 'engagement',
      title: 'Faz tempo que não corta!',
      message: 'Que tal agendar? Seu último corte foi há 3 semanas.',
      time: 'seg • 09:00',
      icon: '⏰',
      color: '#F59E0B',
    },
  ];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#1a365d" />
            </Pressable>
            <Text className="text-lg font-bold uppercase">Notificações</Text>
          </View>
          <Pressable className="p-2">
            <Bell size={20} color="#1a365d" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-foreground-muted">3 não lidas</Text>
          <Pressable>
            <Text className="text-xs font-semibold text-navy">Marcar todas como lidas</Text>
          </Pressable>
        </View>

        <View className="space-y-3">
          {/* HOJE */}
          <Text className="mt-4 text-xs font-bold uppercase text-foreground-muted">Hoje</Text>
          {notifications.slice(0, 2).map((notif) => (
            <Pressable
              key={notif.id}
              className="flex-row items-start gap-3 rounded-lg bg-card p-4"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: notif.color + '20' }}
              >
                <Text className="text-lg">{notif.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">{notif.title}</Text>
                <Text className="mt-1 text-xs text-foreground-muted">{notif.message}</Text>
                <Text className="mt-2 text-xs text-foreground-muted">{notif.time}</Text>
              </View>
            </Pressable>
          ))}

          {/* ONTEM */}
          <Text className="mt-4 text-xs font-bold uppercase text-foreground-muted">Ontem</Text>
          {notifications.slice(2, 4).map((notif) => (
            <Pressable
              key={notif.id}
              className="flex-row items-start gap-3 rounded-lg bg-card p-4 opacity-70"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: notif.color + '20' }}
              >
                <Text className="text-lg">{notif.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">{notif.title}</Text>
                <Text className="mt-1 text-xs text-foreground-muted">{notif.message}</Text>
                <Text className="mt-2 text-xs text-foreground-muted">{notif.time}</Text>
              </View>
            </Pressable>
          ))}

          {/* ESTA SEMANA */}
          <Text className="mt-4 text-xs font-bold uppercase text-foreground-muted">Esta semana</Text>
          {notifications.slice(4).map((notif) => (
            <Pressable
              key={notif.id}
              className="flex-row items-start gap-3 rounded-lg bg-card p-4 opacity-60"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: notif.color + '20' }}
              >
                <Text className="text-lg">{notif.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">{notif.title}</Text>
                <Text className="mt-1 text-xs text-foreground-muted">{notif.message}</Text>
                <Text className="mt-2 text-xs text-foreground-muted">{notif.time}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
