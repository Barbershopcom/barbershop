# Landing — Demo Navegável Mocada — Design

- **Data:** 2026-07-08
- **Status:** Aprovado (design)
- **Escopo:** Substituir os dois placeholders estáticos da landing (`apps/web/src/app/page.tsx`) por demos interativas 100% mocadas, pra o futuro cliente "sentir" o produto antes de contratar. Sem backend, sem iframe: componentes React client-side com dados fixos.

## 1. Decisões

1. **Abordagem:** componentes React puros com dados mocados no próprio arquivo (rejeitados: iframe de tenant demo — frágil/lento; vídeo — não navegável).
2. A landing continua **server component**; só os dois blocos viram client components importados.
3. Hero continua oculto em `<md` (comportamento atual); painel da seção apps funciona em todos os tamanhos.

## 2. Hero — `apps/web/src/components/landing/phone-demo.tsx`

Telefone maior do hero vira o **app do cliente jogável** — fluxo de agendamento em 5 telas, avanço por toque real:

1. **Home**: nome da barbearia + lista de 3 serviços (nome, duração, preço) — tocar num serviço avança.
2. **Barbeiro**: 3 barbeiros (avatar por inicial, nome, nota ★) — tocar avança.
3. **Horário**: grade de slots do dia (alguns "ocupados" desabilitados) — tocar num livre avança.
4. **Pix**: QR fake (SVG/pattern), valor, e após ~1,5s badge "Pagamento confirmado ✓" que avança sozinho.
5. **Sucesso**: check verde + resumo ("Sábado · 14:30 · Renan") + botão "Refazer demo" (reset ao passo 1).

- **Guia de toque**: o elemento tocável da vez tem pulso sutil (animate-pulse/ring); pontos de progresso no topo do telefone.
- Estado local (`useState` de passo + seleções); seleções aparecem no resumo final.
- O telefone menor atrás vira **teaser estático da agenda do barbeiro** (3 cards de horário, sem interação).

## 3. Seção "Dois apps" — `apps/web/src/components/landing/app-demo-panel.tsx`

Painel escuro vira demo com **abas Barbeiro | Painel do dono** (fluxo do cliente já está no hero):

- **Barbeiro**: agenda do dia com 4 horários — 2 confirmados, 1 **pendente pulsando** (tocar → "Confirmado ✓" com transição), 1 livre. Vende o "confirma na hora".
- **Painel do dono**: mini-dashboard mocado — faturamento do dia, cortes da semana, ranking de 3 barbeiros (barras) — estética do admin.
- Paleta do bloco (navy/papel/dourado) mantida; dados verossímeis (Corte degradê R$ 45, Renan ★4,9).

## 4. Fora de escopo

Demo no mobile pro hero (continua oculto), analytics de interação, A/B, tradução.

## 5. Verificação

`pnpm --filter @barbearia/web typecheck && lint && build`; conferência visual no dev server (hero e seção, interações completas, reset).
