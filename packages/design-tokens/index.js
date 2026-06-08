// Tokens canônicos — NAVALHA "papel & couro" (re-skin do handoff
// design_handoff_navalha; ver README do pacote como fonte canônica).
// Fonte única da verdade: muda aqui → propaga pro Tailwind preset, que
// é consumido tanto por NativeWind (mobile) quanto por Tailwind (web).

// ── Cores de marca (5) ──────────────────────────────────────────────
const brand = {
  navy: '#1a365d', // âncora/primária; sidebars, CTAs primários, títulos
  vermelho: '#bf212f', // ação/destaque; conversão, badges, acentos
  dourado: '#c5a059', // acento vintage; selos, anéis de avatar
  papel: '#fffcf5', // fundo claro
  tinta: '#1c1917', // texto principal; fundo do tema escuro
};

// ── 3 temas (CSS-var-ready) ─────────────────────────────────────────
// light "papel" (mobile/app), dark "couro" (mobile), admin "papel quente".
const themes = {
  light: {
    bg: '#fffcf5',
    card: '#fffefb',
    tint: '#f6f0e4',
    ink: '#1c1917',
    muted: '#8a8073',
    frame: '#1a365d', // navy é a primária no claro
    green: '#1f8a5b',
    vermelhoInk: '#a31b28',
    douradoInk: '#9b7a3a',
    hairline: 'rgba(28,25,23,.12)',
    hairlineStrong: 'rgba(28,25,23,.26)',
  },
  dark: {
    bg: '#1c1917',
    card: '#262019',
    tint: '#322a20',
    ink: '#fffcf5',
    muted: '#a89c8a',
    frame: '#c5a059', // dourado vira a primária no escuro
    green: '#4cc38a',
    vermelhoInk: '#f08a8a',
    douradoInk: '#d8b878',
    hairline: 'rgba(255,252,245,.14)',
    hairlineStrong: 'rgba(255,252,245,.32)',
  },
  admin: {
    bg: '#faf6ec',
    card: '#fffefb',
    tint: '#f2ead9',
    ink: '#1c1917',
    muted: '#8a8073',
    navyInk: '#1a365d',
    vermelhoInk: '#a31b28',
    green: '#1f8a5b',
    hairline: 'rgba(28,25,23,.12)',
    hairlineStrong: 'rgba(28,25,23,.26)',
  },
};

// ── 6 cores de status de agendamento ────────────────────────────────
// base = cor cheia (dot/borda); ink = texto no tema claro.
const status = {
  pendente: { base: '#F59E0B', ink: '#9a6608' },
  confirmado: { base: '#1a365d', ink: '#1a365d' },
  concluido: { base: '#10B981', ink: '#0c6e4e' },
  cancelado: { base: '#94A3B8', ink: '#5b6675' },
  expirado: { base: '#bf212f', ink: '#a31b28' },
  noShow: { base: '#D97706', ink: '#9a560a' },
};

// ── Semantic (default = tema light "papel") ─────────────────────────
// Mantém TODAS as chaves que os apps já consomem (background, foreground,
// primary, success, etc.) — agora apontando pros valores NAVALHA. Assim o
// re-skin propaga globalmente sem quebrar nomes de classe existentes.
const colors = {
  // Backgrounds
  background: themes.light.bg, // papel
  backgroundMuted: themes.light.tint, // tint quente
  card: themes.light.card,

  // Foregrounds (text)
  foreground: themes.light.ink, // tinta
  foregroundSecondary: '#3f3a33', // tinta levemente suavizada (labels)
  foregroundMuted: themes.light.muted, // muted "couro"

  // Borders (hairline NAVALHA)
  border: '#ece5d6', // hairline opaco sobre papel (≈ rgba(28,25,23,.12))

  // Brand — remapeado pras 5 cores NAVALHA mantendo os nomes legados
  brandBlue: brand.navy, // primary CTA = navy
  brandBlueForeground: '#FFFFFF',
  brandOrange: brand.dourado, // accent = dourado
  brandOrangeForeground: '#1c1917',
  brandOrangeSoft: themes.light.tint,

  // Cores NAVALHA por nome direto
  navy: brand.navy,
  vermelho: brand.vermelho,
  dourado: brand.dourado,
  papel: brand.papel,
  tinta: brand.tinta,
  'navy-ink': themes.light.frame,
  'vermelho-ink': themes.light.vermelhoInk,
  'dourado-ink': themes.light.douradoInk,

  // Semantic
  destructive: brand.vermelho,
  destructiveForeground: '#FFFFFF',
  success: themes.light.green,
  warning: status.pendente.base,

  // Status (base) — pra badges/bordas/dots
  'status-pendente': status.pendente.base,
  'status-confirmado': status.confirmado.base,
  'status-concluido': status.concluido.base,
  'status-cancelado': status.cancelado.base,
  'status-expirado': status.expirado.base,
  'status-no-show': status.noShow.base,
};

// ── Tipografia (3 famílias NAVALHA) ─────────────────────────────────
// Bebas Neue: display/títulos/números (line-height ≥ 1.0!). Lora italic:
// toques editoriais. Inter: toda a UI. Fontes carregadas por app
// (expo-font no mobile, next/font no web).
const fontFamily = {
  sans: 'Inter', // toda a UI
  display: 'Bebas Neue', // títulos/números condensados
  serif: 'Lora', // legendas/destaques em itálico
};

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800', // labels caps NAVALHA
};

const fontSize = {
  xs: 12, // captions, dividers
  sm: 14, // labels, inputs, body
  base: 16, // títulos de item
  lg: 20, // subtítulo
  xl: 24, // título de tela (Bebas)
  '2xl': 32, // display H2
  '3xl': 46, // display H1
  '4xl': 64, // hero
};

// ── Espaçamento (escala 4px) & raio NAVALHA ─────────────────────────
const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 };

const radius = {
  sm: 8, // pílulas/inputs pequenos
  md: 12, // botões/inputs
  lg: 16, // cards
  xl: 22, // cards grandes/modais
  '2xl': 22,
  '3xl': 22,
  full: 9999,
};

// ── Sombras NAVALHA ─────────────────────────────────────────────────
const shadows = {
  sm: '0 4px 14px rgba(28,25,23,.05)', // card web
  md: '0 6px 16px rgba(28,25,23,.05)', // card mobile
  lg: '0 12px 30px rgba(28,25,23,.12)', // elevação maior
  ring: '0px 0px 0px 1px rgba(28,25,23,.08)',
};

module.exports = {
  brand,
  themes,
  status,
  colors,
  fontFamily,
  fontWeight,
  fontSize,
  spacing,
  radius,
  shadows,
};
