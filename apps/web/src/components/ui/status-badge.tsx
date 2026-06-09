import type { AppointmentStatus } from '@barbearia/schemas';
import { status as statusTokens } from '@barbearia/design-tokens';

import { cn } from '@/lib/utils';

/**
 * StatusBadge NAVALHA (ds: badge = pílula com fundo color-mix(cor 14-16%),
 * borda fina da cor, dot 6px + label Inter 700 ~11px caps).
 *
 * Mapeia os 7 status do appointment (schemas) pras 6 cores de status do
 * handoff; `awaiting_payment` reusa o âmbar do "pendente" com rótulo próprio.
 */
const STATUS_MAP: Record<
  AppointmentStatus,
  { label: string; base: string; ink: string }
> = {
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
  completed: {
    label: 'Concluído',
    base: statusTokens.concluido.base,
    ink: statusTokens.concluido.ink,
  },
  cancelled: {
    label: 'Cancelado',
    base: statusTokens.cancelado.base,
    ink: statusTokens.cancelado.ink,
  },
  expired: { label: 'Expirado', base: statusTokens.expirado.base, ink: statusTokens.expirado.ink },
  no_show: { label: 'No-show', base: statusTokens.noShow.base, ink: statusTokens.noShow.ink },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const s = STATUS_MAP[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase leading-none tracking-wide',
        className,
      )}
      style={{
        color: s.ink,
        backgroundColor: `color-mix(in srgb, ${s.base} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.base} 45%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.base }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}
