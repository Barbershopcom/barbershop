'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils';

const SEG = 13;
const TILE = 52;
const COLORS = ['#bf212f', '#fffcf5', '#1a365d', '#fffcf5'] as const;

/**
 * Faixa barber-pole NAVALHA — listras SVG (sem artefato de subpixel do
 * gradiente CSS em faixas finas). Animação por translateX com loop de 52px.
 */
export function BarberPoleStripe({ className }: { className?: string }) {
  const patternId = useId().replace(/:/g, '');

  return (
    <div className={cn('barber-pole-stripe', className)} aria-hidden>
      <svg
        className="barber-pole-stripe__svg"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <pattern
            id={patternId}
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-45)"
          >
            {COLORS.map((fill, i) => (
              <rect key={fill + String(i)} x={i * SEG} y={0} width={SEG} height={TILE * 2} fill={fill} />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
