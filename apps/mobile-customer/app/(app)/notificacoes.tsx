import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

export default function NotificacoesScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">NOTIFICAÇÕES</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 py-6">
        {/* Push */}
        <View className="mb-4 flex-row items-center justify-between rounded-lg bg-card p-4">
          <View className="flex-1">
            <Text className="font-semibold text-foreground">Notificações Push</Text>
            <Text className="text-xs text-foreground-muted">Alertas no app</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: '#8a8073', true: '#1a365d' }}
            thumbColor="white"
          />
        </View>

        {/* Email */}
        <View className="mb-4 flex-row items-center justify-between rounded-lg bg-card p-4">
          <View className="flex-1">
            <Text className="font-semibold text-foreground">Notificações por Email</Text>
            <Text className="text-xs text-foreground-muted">Promoções e confirmaçõ</Text>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={setEmailEnabled}
            trackColor={{ false: '#8a8073', true: '#1a365d' }}
            thumbColor="white"
          />
        </View>

        {/* SMS */}
        <View className="mb-6 flex-row items-center justify-between rounded-lg bg-card p-4">
          <View className="flex-1">
            <Text className="font-semibold text-foreground">Notificações por SMS</Text>
            <Text className="text-xs text-foreground-muted">Lembretes de agendamentos</Text>
          </View>
          <Switch
            value={smsEnabled}
            onValueChange={setSmsEnabled}
            trackColor={{ false: '#8a8073', true: '#1a365d' }}
            thumbColor="white"
          />
        </View>

        <Text className="text-center text-xs text-foreground-muted">
          Suas preferências foram salvas automaticamente
        </Text>
      </ScrollView>
    </View>
  );
}
