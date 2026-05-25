// Tailwind preset compartilhado. Aplica os tokens do Figma como classes
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
        // Semantic — alinhado com convenção shadcn
        background: colors.background,
        'background-muted': colors.backgroundMuted,
        foreground: colors.foreground,
        'foreground-secondary': colors.foregroundSecondary,
        'foreground-muted': colors.foregroundMuted,
        border: colors.border,
        input: colors.border,
        ring: colors.brandBlue,

        primary: {
          DEFAULT: colors.brandBlue,
          foreground: colors.brandBlueForeground,
        },
        accent: {
          DEFAULT: colors.brandOrange,
          foreground: colors.brandOrangeForeground,
          soft: colors.brandOrangeSoft,
        },
        destructive: {
          DEFAULT: colors.destructive,
          foreground: colors.destructiveForeground,
        },
        success: colors.success,
        warning: colors.warning,

        // Aliases brand pra uso direto
        'brand-blue': colors.brandBlue,
        'brand-orange': colors.brandOrange,
        'brand-orange-soft': colors.brandOrangeSoft,
      },
      fontFamily: {
        sans: [fontFamily.sans, 'system-ui', 'sans-serif'],
        display: [fontFamily.display, 'sans-serif'],
      },
      fontSize: {
        xs: [`${fontSize.xs}px`, { lineHeight: '15px' }],
        sm: [`${fontSize.sm}px`, { lineHeight: '17px' }],
        base: [`${fontSize.base}px`, { lineHeight: '19px' }],
        lg: [`${fontSize.lg}px`, { lineHeight: '24px' }],
        xl: [`${fontSize.xl}px`, { lineHeight: '28px' }],
        '2xl': [`${fontSize['2xl']}px`, { lineHeight: '38px' }],
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
        ring: shadows.ring,
      },
    },
  },
};
