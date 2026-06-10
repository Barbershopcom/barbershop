import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * EmptyState / ErrorState NAVALHA (ds: ícone mono num círculo, título Bebas,
 * subtítulo Lora italic, CTA opcional). `variant` muda a cor do ícone.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'empty',
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'empty' | 'error';
  className?: string;
}) {
  const isError = variant === 'error';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
            isError ? 'text-destructive' : 'text-muted-foreground',
          )}
          style={{
            backgroundColor: isError
              ? 'color-mix(in srgb, hsl(var(--destructive)) 12%, transparent)'
              : 'hsl(var(--secondary))',
          }}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <h3 className="font-display text-2xl uppercase leading-none tracking-wide text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-xs font-serif text-sm italic text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
