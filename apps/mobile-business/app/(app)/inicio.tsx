import type { MyAppointmentItem } from '@barbearia/schemas';
import { Link } from 'expo-router';
import {
  CalendarDays,
  CalendarOff,
  Check,
  ChevronRight,
  LogOut,
  Phone,
  Scissors,
  Sparkles,
  Star,
  UserRound,
  UserX,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
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

/** YYYY-MM-DD de hoje no timezone do device. */
function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function InicioScreen() {
  const { state, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [appointments, setAppointments] = useState<MyAppointmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const today = todayDateString();
      const data = await api.get<MyAppointmentItem[]>(
        `/me/appointments?from=${today}&to=${today}`,
      );
      setAppointments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar agendamentos');
    }
  }, []);

  const complete = useCallback(
    async (id: string) => {
      setActingId(id);
      try {
        await api.patch(`/me/appointments/${id}/complete`);
        await refresh();
      } catch (err) {
        Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível concluir.');
      } finally {
        setActingId(null);
      }
    },
    [refresh],
  );

  const noShow = useCallback(
    (item: MyAppointmentItem) => {
      Alert.alert(
        'Cliente faltou?',
        `${item.customerName} — ${item.service.name}\nMarcar como falta (sem estorno).`,
        [
          { text: 'Voltar', style: 'cancel' },
          {
            text: 'Faltou',
            style: 'destructive',
            onPress: () => {
              setActingId(item.id);
              api
                .patch(`/me/appointments/${item.id}/no-show`)
                .then(() => refresh())
                .catch((err) =>
                  Alert.alert(
                    'Erro',
                    err instanceof ApiError ? err.message : 'Não foi possível marcar falta.',
                  ),
                )
                .finally(() => setActingId(null));
            },
          },
        ],
      );
    },
    [refresh],
  );

  useEffect(() => {
    if (state.status === 'linked') void refresh();
  }, [state.status, refresh]);

  if (state.status !== 'linked') return null;

  const { employee, barbershop, tenant } = state;
  const firstName = employee.displayName.split(' ')[0] ?? employee.displayName;
  const count = appointments?.length ?? 0;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#357BE4" />
        }
      >
        {/* Banner contagem do dia — laranja se >0, neutro se 0 */}
        <View
          className={`flex-row items-center gap-4 rounded-lg border p-5 ${
            count > 0
              ? 'border-border bg-brand-orange-soft'
              : 'border-border bg-background-muted'
          }`}
        >
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <View
                className={`rounded-full px-2.5 py-0.5 ${
                  count > 0 ? 'bg-brand-orange' : 'bg-foreground-muted'
                }`}
              >
                <Text className="text-xs font-semibold text-white">
                  {count} {count === 1 ? 'hoje' : 'hoje'}
                </Text>
              </View>
            </View>
            <Text className="text-base font-medium text-foreground">
              {count === 0
                ? 'Sem agendamentos hoje'
                : count === 1
                  ? '1 agendamento hoje'
                  : `${count} agendamentos hoje`}
            </Text>
            <Text className="text-xs text-foreground-muted">
              Puxe pra baixo pra atualizar.
            </Text>
          </View>
          <Sparkles size={32} color={count > 0 ? '#F27508' : '#727B8E'} strokeWidth={1.5} />
        </View>

        {/* Lista do dia */}
        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : appointments === null ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#357BE4" />
          </View>
        ) : appointments.length > 0 ? (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Hoje
            </Text>
            {appointments.map((a) => (
              <AppointmentRow
                key={a.id}
                item={a}
                busy={actingId === a.id}
                onComplete={() => complete(a.id)}
                onNoShow={() => noShow(a)}
              />
            ))}
          </View>
        ) : null}

        {/* Info da barbearia */}
        <View className="gap-1 rounded-lg border border-border bg-background-muted p-4">
          <Text className="text-xs text-foreground-muted">Você trabalha em</Text>
          <Text className="text-sm font-semibold text-foreground">{tenant?.name ?? '—'}</Text>
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
          <MenuRow
            href="/folgas"
            icon={<CalendarOff size={20} color="#357BE4" />}
            title="Minhas folgas"
            subtitle="Marque períodos em que você não vai atender"
          />
          <MenuRow
            href="/avaliacoes"
            icon={<Star size={20} color="#357BE4" />}
            title="Avaliações"
            subtitle="Veja sua nota e o que os clientes comentaram"
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

function AppointmentRow({
  item,
  busy,
  onComplete,
  onNoShow,
}: {
  item: MyAppointmentItem;
  busy: boolean;
  onComplete: () => void;
  onNoShow: () => void;
}) {
  function callCustomer() {
    if (!item.customerPhone) return;
    void Linking.openURL(`tel:${item.customerPhone}`);
  }

  // Ações de conclusão só pra confirmados (ADR-018 §4).
  const canFinish = item.status === 'confirmed';

  return (
    <View className="gap-3 rounded-lg border border-border bg-background p-4">
      <View className="flex-row items-center gap-3">
        <View className="w-16 items-center">
          <Text className="text-base font-bold text-foreground">{formatTime(item.startAt)}</Text>
          <Text className="text-xs text-foreground-muted">{item.service.durationMin}min</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{item.customerName}</Text>
          <Text className="text-xs text-foreground-muted">{item.service.name}</Text>
          <StatusPill status={item.status} />
        </View>
        {item.customerPhone ? (
          <Pressable
            onPress={callCustomer}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:opacity-60"
            accessibilityLabel={`Ligar para ${item.customerName}`}
          >
            <Phone size={18} color="#357BE4" />
          </Pressable>
        ) : null}
      </View>

      {canFinish ? (
        <View className="flex-row gap-2">
          <Pressable
            onPress={onNoShow}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-border py-2.5 active:opacity-60 disabled:opacity-40"
          >
            <UserX size={15} color="#727B8E" />
            <Text className="text-sm font-medium text-foreground-muted">Faltou</Text>
          </Pressable>
          <Pressable
            onPress={onComplete}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-success py-2.5 active:opacity-80 disabled:opacity-40"
          >
            {busy ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Check size={15} color="white" />
                <Text className="text-sm font-bold text-white">Concluir</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatusPill({ status }: { status: MyAppointmentItem['status'] }) {
  const map: Record<MyAppointmentItem['status'], { label: string; cls: string }> = {
    awaiting_payment: { label: 'Aguardando pgto', cls: 'text-brand-orange' },
    pending: { label: 'Aguardando você', cls: 'text-brand-orange' },
    confirmed: { label: 'Confirmado', cls: 'text-primary' },
    completed: { label: 'Concluído', cls: 'text-success' },
    cancelled: { label: 'Cancelado', cls: 'text-foreground-muted' },
    expired: { label: 'Expirado', cls: 'text-destructive' },
    no_show: { label: 'Faltou', cls: 'text-foreground-muted' },
  };
  const s = map[status];
  return <Text className={`mt-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</Text>;
}

function MenuRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: '/perfil' | '/servicos' | '/agenda' | '/folgas' | '/avaliacoes';
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
