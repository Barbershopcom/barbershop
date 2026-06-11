import type { AppointmentStatus } from '@barbearia/schemas';
import { status as statusTokens } from '@barbearia/design-tokens';
import { Text, View } from 'react-native';

/**
 * StatusBadge NAVALHA (mobile) — pílula com fundo tingido (~15% da cor),
 * dot e label caps na cor "ink". Paridade com o StatusBadge web. Mapeia os
 * 7 status do schema pras 6 cores do handoff (awaiting_payment = âmbar).
 */
const MAP: Record<AppointmentStatus, { label: string; base: string; ink: string }> = {
  awaiting_payment: {
    label: 'Aguardando pgto',
    base: statusTokens.pendente.base,
    ink: statusTokens.pendente.ink,
  },
  pending: { label: 'Pendente', base: statusTokens.pendente.base, ink: statusTokens.pendente.ink },
  confirmed: {
    label: 'Confirmado',
    base: statusTokens.confirmado.base,
    ink: statusTokens.confirmado.ink,
  },
  completed: { label: 'Concluído', base: statusTokens.concluido.base, ink: statusTokens.concluido.ink },
  cancelled: { label: 'Cancelado', base: statusTokens.cancelado.base, ink: statusTokens.cancelado.ink },
  expired: { label: 'Expirado', base: statusTokens.expirado.base, ink: statusTokens.expirado.ink },
  no_show: { label: 'Faltou', base: statusTokens.noShow.base, ink: statusTokens.noShow.ink },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = MAP[status];
  return (
    <View
      className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-0.5"
      // ~15% bg e ~45% borda via alpha de 8 dígitos (RN aceita #RRGGBBAA).
      style={{ backgroundColor: `${s.base}26`, borderWidth: 1, borderColor: `${s.base}73` }}
    >
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.base }} />
      <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: s.ink }}>
        {s.label}
      </Text>
    </View>
  );
}
