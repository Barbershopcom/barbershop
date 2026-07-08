import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  QrCode,
  Star,
  Tag,
  Users,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AppDemoPanel } from '@/components/landing/app-demo-panel';
import { HeroPhones } from '@/components/landing/phone-demo';
import { PricingSection } from '@/components/landing/pricing';
import { Seal } from '@/components/ui/seal';

export const metadata: Metadata = {
  title: 'NAVALHA — Software para barbearias',
  description:
    'Agenda online, pagamento no Pix, lembretes automáticos e controle de toda a equipe — sob medida pra barbearia brasileira.',
};

const STRIPE =
  'repeating-linear-gradient(-45deg, #bf212f 0 13px, #fffcf5 13px 26px, #1a365d 26px 39px, #fffcf5 39px 52px)';

const TRUST = [
  { n: '1.200+', l: 'barbearias usando' },
  { n: '480 mil', l: 'cortes agendados' },
  { n: 'R$ 0', l: 'de taxa no Pix' },
  { n: '4,9 ★', l: 'avaliação dos donos' },
];

const FEATURES = [
  { icon: CalendarClock, title: 'Agenda online 24h', desc: 'O cliente marca sozinho, direto do celular, a qualquer hora — sem você parar o corte pra atender o telefone.' },
  { icon: QrCode, title: 'Pix sem taxa', desc: 'Pagamento com confirmação na hora e dinheiro caindo na conta. Cartão com parcelamento quando o cliente preferir.' },
  { icon: BellRing, title: 'Lembretes automáticos', desc: 'Avisos automáticos antes do horário derrubam o no-show e enchem de novo a cadeira que ficaria vazia.' },
  { icon: Users, title: 'Equipe sob controle', desc: 'Cada barbeiro com a própria agenda, serviços, disponibilidade e folgas. Você vê tudo num lugar só.' },
  { icon: Tag, title: 'Promoções e cupons', desc: 'Crie códigos de desconto e promoções pra encher os horários parados e fidelizar a clientela.' },
  { icon: BarChart3, title: 'Relatórios e repasse', desc: 'Faturamento, comissão de cada barbeiro e quem mais produziu no mês — sem caderninho, sem planilha.' },
];

const QUOTES = [
  { quote: 'Larguei o caderninho e nunca mais perdi um horário. O Pix cai na hora, sem enrolação.', name: 'Jajá', role: 'Barbearia do Jajá · SP', av: '#1a365d' },
  { quote: 'Meus barbeiros confirmam sozinhos pelo app e o no-show despencou. Mudou meu mês.', name: 'Renan', role: 'Corte Fino · RJ', av: '#bf212f' },
  { quote: 'Configurei em 5 minutos e no mesmo dia já tava recebendo agendamento pelo link.', name: 'Du', role: 'Studio Du Barber · MG', av: '#c5a059' },
];

const FAQ = [
  { q: 'Preciso de cartão pra testar?', a: 'Não. Você cria sua barbearia e usa 14 dias grátis sem informar cartão. Só cobra se você decidir continuar.' },
  { q: 'Como funciona o Pix?', a: 'O cliente paga pelo app e a confirmação é instantânea, sem taxa. O valor cai direto na conta da barbearia.' },
  { q: 'Posso cadastrar vários barbeiros?', a: 'Sim. No Basic até 5 barbeiros e no Pro ilimitado, cada um com agenda, serviços e folgas próprios.' },
  { q: 'Tem fidelidade ou multa?', a: 'Nenhuma. É mensal e você cancela quando quiser, sem multa nem letra miúda.' },
  { q: 'O cliente precisa baixar app?', a: 'Pode agendar pelo navegador, pelo link da sua barbearia. O app dá lembretes e histórico, mas é opcional.' },
  { q: 'Quanto tempo leva pra configurar?', a: 'Cerca de 5 minutos: cria a conta, cadastra serviços e horários, e já sai compartilhando o link.' },
];

export default function HomePage() {
  return (
    <div className="bg-background">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center gap-6 px-7">
          <Link href="#top" className="flex items-center gap-2.5">
            <Seal size={38} />
            <b className="font-display text-2xl tracking-wider text-foreground">NAVALHA</b>
          </Link>
          <div className="ml-3 hidden gap-6 md:flex">
            {[
              ['Recursos', '#recursos'],
              ['Os apps', '#apps'],
              ['Planos', '#planos'],
              ['Dúvidas', '#faq'],
            ].map(([l, h]) => (
              <a key={h} href={h} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {l}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-xl border border-border px-4 text-sm font-bold text-foreground sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center rounded-xl bg-destructive px-4 text-sm font-bold text-destructive-foreground shadow"
            >
              Teste grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-7 py-16 md:grid-cols-2 md:py-20">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
              Software para barbearias
            </span>
            <h1 className="mt-4 font-display text-6xl uppercase leading-[0.98] tracking-wide text-foreground md:text-7xl">
              Sua barbearia no <span className="text-destructive">piloto</span> automático.
            </h1>
            <p className="mt-5 max-w-md font-serif text-xl italic text-muted-foreground">
              Agenda online, pagamento no Pix, lembretes automáticos e controle de toda a equipe — num
              sistema feito sob medida pra barbearia brasileira.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href="/onboarding"
                className="inline-flex h-[50px] items-center gap-2 rounded-xl bg-destructive px-6 text-sm font-bold text-destructive-foreground shadow-card transition-transform hover:-translate-y-0.5"
              >
                Teste grátis por 14 dias <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#apps"
                className="inline-flex h-[50px] items-center rounded-xl border border-border px-6 text-sm font-bold text-foreground"
              >
                Ver os apps
              </a>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-600" />
              14 dias grátis · cancele quando quiser
            </div>
          </div>
          <div className="hidden md:flex md:justify-center">
            <div className="relative">
              <div
                className="absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(197,160,89,.18), transparent 65%)' }}
              />
              <HeroPhones />
            </div>
          </div>
        </div>
      </header>

      {/* TRUST */}
      <div className="border-y border-border bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-7 py-7">
          {TRUST.map((t) => (
            <div key={t.l}>
              <b className="block font-display text-4xl leading-none text-navy">{t.n}</b>
              <span className="text-[13px] font-medium text-muted-foreground">{t.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="recursos" className="py-20">
        <div className="mx-auto max-w-6xl px-7">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
              Por que NAVALHA
            </span>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide text-foreground">
              Tudo que a cadeira precisa
            </h2>
            <p className="mt-3 font-serif text-lg italic text-muted-foreground">
              Da primeira mensagem do cliente ao repasse no fim do mês — sem papel, sem caderninho,
              sem dor de cabeça.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-[18px] border border-border bg-card p-6 transition-transform hover:-translate-y-1 hover:shadow-card"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-secondary text-navy">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP SHOWCASE */}
      <section id="apps" className="pb-20">
        <div className="mx-auto max-w-6xl px-7">
          <div className="relative overflow-hidden rounded-[28px] bg-primary text-papel">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ background: 'repeating-linear-gradient(-45deg, #fff 0 16px, transparent 16px 36px)' }}
            />
            <div className="relative grid items-center gap-8 p-10 md:grid-cols-2 md:p-12">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-dourado">
                  App do cliente + do barbeiro
                </span>
                <h2 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide">
                  Dois apps, uma barbearia afiada.
                </h2>
                <p className="mt-3 font-serif text-base italic text-papel/80">
                  O cliente agenda e paga sozinho. O barbeiro vê a agenda e confirma na hora. Você
                  acompanha tudo pelo painel web.
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    'Agendamento 24h, direto do celular',
                    'Pix com confirmação instantânea',
                    'Lembretes que derrubam o no-show',
                  ].map((li) => (
                    <li key={li} className="flex items-center gap-3 text-[15px]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dourado/20">
                        <Check className="h-3 w-3 text-dourado" strokeWidth={3} />
                      </span>
                      {li}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/descobrir"
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-dourado px-6 text-sm font-bold text-tinta transition-transform hover:-translate-y-0.5"
                >
                  Ver barbearias no app <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <AppDemoPanel />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-7">
          <div className="mb-12 text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
              Quem já passou a régua
            </span>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide text-foreground">
              Donos que não voltam atrás
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {QUOTES.map((q) => (
              <div key={q.name} className="flex flex-col rounded-[18px] border border-border bg-card p-6">
                <div className="mb-3.5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-dourado text-dourado" />
                  ))}
                </div>
                <p className="flex-1 font-serif text-base leading-relaxed text-foreground">
                  “{q.quote}”
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full font-display text-base text-white"
                    style={{ backgroundColor: q.av }}
                  >
                    {q.name[0]}
                  </span>
                  <div>
                    <b className="block text-sm">{q.name}</b>
                    <span className="text-xs text-muted-foreground">{q.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="bg-secondary py-20">
        <div className="mx-auto max-w-6xl px-7">
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-7">
          <div className="mb-10 text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
              Dúvidas
            </span>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide text-foreground">
              Perguntas na cadeira
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-serif text-[15px] italic text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-7 pb-20">
        <div className="relative overflow-hidden rounded-[28px] bg-secondary px-7 py-16 text-center">
          <div className="absolute inset-x-0 top-0 h-[7px]" style={{ background: STRIPE }} />
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
            Bora afiar?
          </span>
          <h2 className="mt-3 font-display text-6xl uppercase leading-none tracking-wide text-foreground">
            Sua agenda lotada começa hoje.
          </h2>
          <p className="mt-3 font-serif text-lg italic text-muted-foreground">
            14 dias grátis. Configuração em 5 minutos. Sem fidelidade.
          </p>
          <Link
            href="/onboarding"
            className="mt-7 inline-flex h-14 items-center gap-2 rounded-xl bg-destructive px-7 text-base font-bold text-destructive-foreground shadow-card transition-transform hover:-translate-y-0.5"
          >
            Criar minha barbearia <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-tinta py-14 text-papel/70">
        <div className="mx-auto max-w-6xl px-7">
          <div className="grid gap-8 border-b border-papel/10 pb-9 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Seal size={38} />
                <b className="font-display text-2xl tracking-wider text-papel">NAVALHA</b>
              </div>
              <p className="mt-4 max-w-64 text-[13.5px] leading-relaxed">
                O sistema de gestão e agendamento feito pra barbearia brasileira. Do balcão ao Pix,
                tudo numa navalha só.
              </p>
            </div>
            {[
              { h: 'Produto', links: [['Recursos', '#recursos'], ['Planos', '#planos'], ['Os apps', '#apps'], ['Descobrir', '/descobrir']] },
              { h: 'Empresa', links: [['Sobre', '#'], ['Blog', '#'], ['Contato', '#']] },
              { h: 'Suporte', links: [['Central de ajuda', '#faq'], ['Termos', '#'], ['Privacidade', '#']] },
            ].map((col) => (
              <div key={col.h}>
                <h4 className="mb-3.5 text-xs font-extrabold uppercase tracking-wider text-dourado">
                  {col.h}
                </h4>
                {col.links.map(([l, h]) => (
                  <a key={l} href={h} className="mb-2.5 block text-sm hover:text-papel">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 text-xs">
            <span>© 2026 NAVALHA Tecnologia</span>
            <span>Feito com 🪒 no Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
