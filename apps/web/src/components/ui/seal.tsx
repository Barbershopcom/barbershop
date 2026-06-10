import { cn } from '@/lib/utils';

/**
 * Barber pole NAVALHA — pílula com listras diagonais vermelho/papel/navy
 * dentro de borda dourada. Motivo de marca recorrente (headers, recap).
 */
export function BarberPole({
  width = 10,
  height = 22,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block', className)}
      style={{
        width,
        height,
        borderRadius: 999,
        border: '1.3px solid hsl(var(--primary))',
        overflow: 'hidden',
        background:
          'repeating-linear-gradient(-45deg, #bf212f 0 4px, #fffcf5 4px 8px, #1a365d 8px 12px, #fffcf5 12px 16px)',
        boxShadow: 'inset 0 0 0 1.5px #fffcf5',
      }}
      aria-hidden
    />
  );
}

/**
 * Selo da marca — círculo navy com anel dourado tracejado + barber pole no
 * centro. Usado em splash/login/headers de marca.
 */
export function Seal({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full bg-primary', className)}
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 0 2px hsl(var(--background)), 0 0 0 3.5px #c5a059',
        outline: '1.5px dashed #c5a059',
        outlineOffset: 2,
      }}
    >
      <BarberPole width={Math.round(size * 0.18)} height={Math.round(size * 0.5)} />
    </span>
  );
}
