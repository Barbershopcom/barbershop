// Tailwind preset compartilhado. Aplica os tokens NAVALHA como classes
// utilitárias. Tanto NativeWind (mobile) quanto Tailwind (web) consomem.
//
// Uso:
//   const dtPreset = require('@barbearia/design-tokens/tailwind-preset');
//   module.exports = { presets: [require('nativewind/preset'), dtPreset], ... };

const { colors, fontFamily, fontSize, radius, shadows } = require('./index');

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic — alinhado com convenção shadcn (valores re-skinados NAVALHA)
        background: colors.background,
        'background-muted': colors.backgroundMuted,
        card: colors.card,
        foreground: colors.foreground,
        'foreground-secondary': colors.foregroundSecondary,
        'foreground-muted': colors.foregroundMuted,
        border: colors.border,
        input: colors.border,
        ring: colors.navy,

        primary: {
          DEFAULT: colors.navy,
          foreground: colors.brandBlueForeground,
        },
        accent: {
          DEFAULT: colors.dourado,
          foreground: colors.brandOrangeForeground,
          soft: colors.brandOrangeSoft,
        },
        destructive: {
          DEFAULT: colors.destructive,
          foreground: colors.destructiveForeground,
        },
        success: colors.success,
        warning: colors.warning,

        // Aliases legados (mantidos pra não quebrar telas existentes)
        'brand-blue': colors.brandBlue,
        'brand-orange': colors.brandOrange,
        'brand-orange-soft': colors.brandOrangeSoft,

        // Cores de marca NAVALHA por nome direto
        navy: colors.navy,
        vermelho: colors.vermelho,
        dourado: colors.dourado,
        papel: colors.papel,
        tinta: colors.tinta,
        'navy-ink': colors['navy-ink'],
        'vermelho-ink': colors['vermelho-ink'],
        'dourado-ink': colors['dourado-ink'],

        // Cores de status (6) — badges, bordas, dots
        'status-pendente': colors['status-pendente'],
        'status-confirmado': colors['status-confirmado'],
        'status-concluido': colors['status-concluido'],
        'status-cancelado': colors['status-cancelado'],
        'status-expirado': colors['status-expirado'],
        'status-no-show': colors['status-no-show'],
      },
      fontFamily: {
        sans: [fontFamily.sans, 'system-ui', 'sans-serif'],
        display: [fontFamily.display, 'Inter', 'sans-serif'],
        serif: [fontFamily.serif, 'Georgia', 'serif'],
      },
      fontSize: {
        xs: [`${fontSize.xs}px`, { lineHeight: '15px' }],
        sm: [`${fontSize.sm}px`, { lineHeight: '17px' }],
        base: [`${fontSize.base}px`, { lineHeight: '19px' }],
        lg: [`${fontSize.lg}px`, { lineHeight: '24px' }],
        xl: [`${fontSize.xl}px`, { lineHeight: '26px' }],
        // Display (Bebas Neue) — line-height ≥ 1.0 pra não sangrar glifos.
        '2xl': [`${fontSize['2xl']}px`, { lineHeight: '34px' }],
        '3xl': [`${fontSize['3xl']}px`, { lineHeight: '46px' }],
        '4xl': [`${fontSize['4xl']}px`, { lineHeight: '64px' }],
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        DEFAULT: `${radius.md}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`,
        '2xl': `${radius['2xl']}px`,
        '3xl': `${radius['3xl']}px`,
        full: `${radius.full}px`,
      },
      boxShadow: {
        soft: shadows.sm,
        card: shadows.md,
        lg: shadows.lg,
        ring: shadows.ring,
      },
    },
  },
};
