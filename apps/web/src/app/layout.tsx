import type { Metadata } from 'next';
import { Bebas_Neue, Inter, Lora } from 'next/font/google';

import './globals.css';

// Fontes NAVALHA (papel & couro). Bebas = display/títulos/números,
// Lora italic = toques editoriais, Inter = toda a UI. Expostas como CSS
// vars que o tailwind-preset mapeia (font-display/font-serif/font-sans).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});
const lora = Lora({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NAVALHA — Gestão de barbearias',
  description: 'Agendamento, equipe e pagamento numa única ferramenta para sua barbearia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${bebas.variable} ${lora.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
