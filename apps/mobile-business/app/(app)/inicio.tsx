import { Link } from 'expo-router';
import { CalendarDays, ChevronRight, LogOut, Scissors, Sparkles, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { useSession } from '@/lib/session';

function roleLabel(role: 'admin' | 'barber' | 'admin_barber'): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'barber':
      return 'Barbeiro';
    case 'admin_barber':
      return 'Admin + Barbeiro';
  }
}

export default function InicioScreen() {
  const { state, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (state.status !== 'linked') return null;

  const { employee, barbershop, tenant } = state;
  const firstName = employee.displayName.split(' ')[0] ?? employee.displayName;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Página inicial"
        title={`Bom ver você, ${firstName}!`}
        avatarInitial={initialsOf(employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="p-6 pb-12 gap-5"
      >
        {/* Banner laranja-soft (placeholder até Sprint 4 ter appointments) */}
        <View className="flex-row items-center gap-4 rounded-lg border border-border bg-brand-orange-soft p-5">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-brand-orange px-2.5 py-0.5">
                <Text className="text-xs font-semibold text-white">0 pendentes</Text>
              </View>
            </View>
            <Text className="text-base font-medium text-foreground">Veja seus agendamentos</Text>
            <Text className="text-xs text-foreground-muted">
              Em breve (Sprint 4) — push notification quando cliente agendar.
            </Text>
          </View>
          <Sparkles size={32} color="#F27508" strokeWidth={1.5} />
        </View>

        {/* Info da barbearia */}
        <View className="gap-1 rounded-lg border border-border bg-background-muted p-4">
          <Text className="text-xs text-foreground-muted">Você trabalha em</Text>
          <Text className="text-sm font-semibold text-foreground">
            {tenant?.name ?? '—'}
          </Text>
          <Text className="text-xs text-foreground-muted">
            {barbershop?.name ?? '—'} · {roleLabel(employee.role)}
          </Text>
        </View>

        {/* Menu */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Configurações
          </Text>

          <MenuRow
            href="/perfil"
            icon={<UserRound size={20} color="#357BE4" />}
            title="Meu perfil"
            subtitle="Editar nome de exibição"
          />
          <MenuRow
            href="/servicos"
            icon={<Scissors size={20} color="#357BE4" />}
            title="Meus serviços"
            subtitle="Marcar quais serviços do catálogo você atende"
          />
          <MenuRow
            href="/agenda"
            icon={<CalendarDays size={20} color="#357BE4" />}
            title="Minha agenda"
            subtitle="Defina seus horários de trabalho semanais"
          />
        </View>

        {/* Sair */}
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 disabled:opacity-60"
        >
          {signingOut ? (
            <ActivityIndicator color="#727B8E" />
          ) : (
            <>
              <LogOut size={16} color="#727B8E" />
              <Text className="text-sm font-medium text-foreground-muted">Sair</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: '/perfil' | '/servicos' | '/agenda';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-lg border border-border bg-background p-4 active:opacity-70">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-background-muted">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-xs text-foreground-muted">{subtitle}</Text>
        </View>
        <ChevronRight size={18} color="#727B8E" />
      </Pressable>
    </Link>
  );
}
