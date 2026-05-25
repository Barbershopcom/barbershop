// Tokens canônicos extraídos do Figma do app barbeiro.
// Fonte da verdade — mudanças aqui propagam pro Tailwind preset.

const colors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundMuted: '#F7F8FD', // muted bg da home

  // Foregrounds (text)
  foreground: '#202026', // texto primário (títulos)
  foregroundSecondary: '#434A57', // labels (Email, Senha)
  foregroundMuted: '#727B8E', // placeholders, captions, hints

  // Borders (versão composta sobre branco — rgba(114, 123, 142, 0.1) renderizada)
  border: '#ECEDF0',

  // Brand
  brandBlue: '#357BE4', // primary CTA
  brandBlueForeground: '#FFFFFF',
  brandOrange: '#F27508', // logo + accents
  brandOrangeForeground: '#FFFFFF',
  brandOrangeSoft: '#FBF3E4', // bg do highlight card (Home)

  // Semantic
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};

const fontFamily = {
  sans: 'Inter',
  display: 'Manrope', // labels de atalho na Home
};

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const fontSize = {
  xs: 12, // captions, dividers
  sm: 14, // labels, inputs, body
  base: 16, // greeting "Bom ver você"
  lg: 20, // page title "Acesse sua conta"
  xl: 24,
  '2xl': 32,
};

const radius = {
  sm: 4, // inputs, checkbox
  md: 8, // botões, cards padrão
  lg: 12, // icon containers, social
  xl: 16,
  '2xl': 24,
  '3xl': 42, // top do bottom sheet (Home)
  full: 9999,
};

// Shadows do Figma — convertido pra formato RN/Tailwind compatível.
// Em RN, shadows via boxShadow (NativeWind 4 suporta).
const shadows = {
  sm: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0px 1px 4px rgba(12, 12, 13, 0.1), 0px 1px 4px rgba(12, 12, 13, 0.05)',
  ring: '0px 0px 0px 1px rgba(0, 0, 0, 0.08)',
};

module.exports = { colors, fontFamily, fontWeight, fontSize, radius, shadows };
