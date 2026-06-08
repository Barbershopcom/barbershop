# Handoff: NAVALHA — Plataforma SaaS de Barbearia

## Overview
NAVALHA é uma plataforma de agendamento e gestão para barbearias brasileiras. O produto tem **quatro frentes** + um **design system**:

1. **App do Cliente** (mobile) — descobrir barbearia, agendar serviço/barbeiro/horário, pagar no Pix ou cartão, acompanhar e avaliar.
2. **App do Barbeiro** (mobile) — agenda do dia, confirmar/recusar pedidos, carteira/repasse, serviços, disponibilidade, folgas.
3. **Admin Web** (desktop) — dashboard de KPIs, agenda da equipe, gestão de barbeiros/serviços, promoções, relatórios financeiros.
4. **SaaS do dono** (web) — landing comercial + cadastro self-service (conta → barbearia → plano → pagamento → onboarding).
5. **Design System** — fundamentos (cores, tipografia, espaçamento) e catálogo de componentes.

Estética: **"papel & couro"** — barbearia vintage clássica com execução de app moderno (acentos sutis: barber pole, linhas douradas, selo).

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML/React (via Babel no navegador)** — protótipos que mostram a aparência e o comportamento pretendidos, **não código de produção pra copiar direto**. A tarefa é **recriar estes designs no ambiente do codebase alvo** (React Native/Expo pro mobile, Next.js/React pro web admin e landing) usando os padrões e bibliotecas já estabelecidos lá. Se ainda não houver ambiente, escolha o framework mais adequado (sugestão: **Expo + React Native** pros apps mobile, **Next.js + Tailwind** pro web) e implemente os designs nele.

Os protótipos usam React 18 + Babel standalone + estilos inline. Os componentes mobile são renderizados dentro de um frame de iPhone (`ios-frame.jsx`) e os web dentro de um frame de browser (`browser-window.jsx`) — **esses frames são só andaime de apresentação**, não fazem parte do produto.

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamento e interações são finais. Recrie a UI fielmente usando as bibliotecas/padrões do codebase. As únicas exceções de baixa fidelidade são `Checkout Wireframes.html` (exploração inicial de 5 abordagens — descartável) e os mapas de fluxo (`Fluxo do cliente.html`), que são material de apresentação.

---

## Design Tokens

### Cores da marca
| Token | Hex | Uso |
|---|---|---|
| `navy` | `#1a365d` | Cor âncora/primária; sidebars, CTAs primários, títulos |
| `vermelho` | `#bf212f` | Ação/destaque; CTAs de conversão, badges, acentos |
| `dourado` | `#c5a059` | Acento vintage; selos, anéis de avatar, detalhes |
| `papel` | `#fffcf5` | Fundo claro |
| `tinta` | `#1c1917` | Texto principal; fundo do tema escuro |

### Tema claro (mobile/app — "papel")
```
--bg: #fffcf5;        --card: #fffefb;      --tint: #f6f0e4;
--ink: #1c1917;       --muted: #8a8073;
--frame: #1a365d (navy);  --green: #1f8a5b;  --vermelho-ink: #a31b28;  --dourado-ink: #9b7a3a;
--hairline: rgba(28,25,23,.12);   --hairline-strong: rgba(28,25,23,.26);
```
### Tema escuro (mobile — "couro")
```
--bg: #1c1917;  --card: #262019;  --tint: #322a20;  --ink: #fffcf5;  --muted: #a89c8a;
--frame: #c5a059 (dourado vira a cor primária no escuro);  --green: #4cc38a;
--hairline: rgba(255,252,245,.14);  --hairline-strong: rgba(255,252,245,.32);
```
### Tema admin/web (desktop — "papel" mais quente)
```
--bg: #faf6ec;  --card: #fffefb;  --tint: #f2ead9;  --ink: #1c1917;  --muted: #8a8073;
--navy-ink: #1a365d;  --vermelho-ink: #a31b28;  --green: #1f8a5b;
```

### Cores de status (6 estados de agendamento)
| Estado | Hex | Texto (claro) |
|---|---|---|
| Pendente | `#F59E0B` | `#9a6608` |
| Confirmado | `#1a365d` | `#1a365d` |
| Concluído | `#10B981` | `#0c6e4e` |
| Cancelado | `#94A3B8` | `#5b6675` |
| Expirado | `#bf212f` | `#a31b28` |
| No-show | `#D97706` | `#9a560a` |
Badge = pílula com fundo `color-mix(cor 14-16%, transparent)`, borda fina da cor, dot 6px + label em Inter 700 ~11px caps.

### Tipografia
- **Bebas Neue** (Google Fonts) — display/títulos/números. Condensada, impactante. Tamanhos 22–84px. `letter-spacing` 0.5–1.5px. **Importante:** use `line-height` ≥ 1.0 (o Bebas sangra glifos com line-height < 1). Em mobile, títulos de tela ~22–30px.
- **Lora** *italic* (Google Fonts) — toques editoriais, legendas, subtítulos. 11–20px, sempre `font-style: italic` quando usado como acento.
- **Inter** (Google Fonts) — toda a UI. Pesos 400/500/600/700/800. Labels em caps usam 800 + `letter-spacing` 0.6–1px + `text-transform: uppercase`, 10–11px.

### Espaçamento & raio
- Escala base **4px** (4, 8, 12, 16, 24, 32).
- Raios: **8** (pílulas/inputs pequenos), **11–13** (botões/inputs), **14–16** (cards), **18–22** (cards grandes/modais), **999** (pílulas/avatares).
- Sombra de card padrão: `0 4px 14px rgba(28,25,23,.05)` (web) / `0 6px 16px rgba(28,25,23,.05)` (mobile). Elevação maior: `0 12px 30px rgba(28,25,23,.12)`.
- Hit target mínimo mobile: **44px**.

### Motivos visuais recorrentes
- **Barber pole:** pílula com `repeating-linear-gradient(-45deg, vermelho, papel, navy/azul, papel)` dentro de borda dourada.
- **Listras diagonais:** `repeating-linear-gradient(-45deg, #fff 0 12-16px, transparent ...)` a ~10% opacidade sobre fundos navy/vermelho.
- **Selo da marca:** círculo navy com anel dourado tracejado + barber pole no centro.
- **Comanda/recibo:** divisórias com `border: dashed` e tabular-nums pra valores.

---

## Estrutura de Navegação (rotas)

### App Cliente (`Protótipo navegável.html`)
`splash → onboarding → login → home → busca → barbearia → agendar(serviços→barbeiro→dia/hora) → checkout → pix → sucesso → historico → detalhe`. Mais: `perfil`, `editar`, `notificacoes`, `promocoes`. BottomTabBar de 5 abas (Início, Buscar, Agenda, Carteira, Perfil).

### App Barbeiro (`Barbeiro - Protótipo navegável.html`)
`login → dash → pendentes → bdetalhe → agenda → ajustes → {bservicos, bdisponibilidade, bfolgas, bconfig} → perfil`. BottomTabBar de 4 abas (Início, Agenda, Ajustes, Perfil).

### Admin Web (`Admin - Painel da barbearia.html`)
Sidebar: `dashboard, agenda, barbeiros, servicos, promocoes, relatorios, perfil`. Modais: convite de barbeiro (C3), nova promoção (C6, com preview ao vivo do card do cliente).

### SaaS dono (`D1 Landing comercial.html` + `D3 Signup.html`)
Landing → `D3 Signup`: wizard de 9 passos `conta → barbearia → plano → pagamento → intro → barbeiros → servicos → horarios → pronto`. Pula `pagamento` se o plano for Free. Dados propagam entre passos (nome do dono → tela de boas-vindas; nome da barbearia → slug `navalha.app/b/<slug>`).

---

## Telas — detalhe

> Cada arquivo `.jsx` é um componente de tela; os `.html` de mesmo nome são hosts que montam o componente num frame. Veja a seção **Files** pro mapa. Abaixo, o resumo funcional de cada tela. Para medidas/cores exatas, **o `.jsx` é a fonte da verdade** — está todo em estilos inline legíveis.

### A — App Cliente
- **A1/A5 Splash & Onboarding** (`onboarding.jsx`): splash com selo (auto-avança ~1.7s) → 3 slides (agendar / pagar Pix / lembretes) com dots + CTA. "Pular"/"Começar" → login.
- **A2 Login** (`login.jsx`): selo+wordmark, email/senha (toggle de visibilidade), "esqueci", divisor, botões sociais (Google/Apple), "criar conta". Estados loading/erro. Tweak simula sucesso/erro.
- **A6 Home** (`home.jsx`): header (avatar+saudação+sino), barra de busca, carrossel de Promoções (`PromoCard`), "Seus agendamentos", "Barbeiros em destaque". BottomTabBar.
- **A7 Busca** (`search.jsx`): campo de busca + chips de filtro + lista de `BarbershopCard` + empty state.
- **A8 Página da barbearia** (`barbershop.jsx`): banner gráfico + selo + nome/endereço/social; abas Serviços|Barbeiros|Avaliações|Info; `ServiceCard` com seleção; **CTA "Agendar agora" sticky no rodapé** (não no header).
- **A9–A11 Agendar** (`booking-wizard.jsx`): wizard 3 passos. (1) Serviços multi-seleção; (2) Barbeiro filtrado pelos serviços (+"qualquer"); (3) calendário (dias disponíveis) + grade de horários. Resumo sticky. Cascata: trocar serviço reseta barbeiro/horário. Entrega pro checkout. **Header simples (voltar + título), sem steps visíveis, só no wizard.**
- **A12 Checkout** (`vintage-checkout.jsx`): metáfora de comanda/recibo com picote. PaymentMethodSelector (Pix recomendado padrão sem taxa / Cartão com parcelamento). Troca de método recalcula taxa/total. Aceite de política habilita CTA. Estados processando/erro.
- **A13 Pix** (`pix-payment.jsx`): QR + copia-e-cola + countdown 10min + polling → sucesso. (No protótipo navegável tem botão "Já fiz o pagamento" pra avanço determinístico; o standalone usa timer real.)
- **A14 Sucesso** (`success-screen.jsx`): check comemorativo + confete + mini-comanda + badge PENDENTE + 2 CTAs.
- **A15 Histórico** (`appointments.jsx`): abas Próximos/Histórico + `AppointmentCard` por status + empty state + BottomTabBar.
- **A16 Detalhe** (`appointment-detail.jsx`): badge de status + cabeçalho serviço/data + mini-mapa + itens da comanda + pagamento (método/valor/ID transação) + timeline de status + ações por status + WhatsApp.
- **A17 Avaliar** (`review.jsx`): estrelas + label dinâmico + chips de tags contextuais + textarea + enviar/pular + estado de agradecimento.
- **A18 Cancelar** (`cancel.jsx`): recap + política (grátis vs taxa) + motivo (radio opcional) + breakdown + confirmar/manter → processando→feito.
- **A19 Perfil** (`profile.jsx`), **A20 Editar perfil** (`edit-profile.jsx`), **A22 Promoções** (`promos.jsx`), **A23 Notificações** (`notifications.jsx`).

### B — App Barbeiro (`barber-kit.jsx`, `barber-screens-1.jsx`, `barber-screens-2.jsx`)
- **B2 Dashboard:** header, stat band (cortes hoje / próximo), lista "Hoje", "Pendentes" (cards com Confirmar/Recusar + toast), card de Carteira (saldo + Sacar).
- **B3 Pendentes:** lista de `BookingPendingCard`; empty state "Tudo confirmado".
- **B4 Detalhe booking:** badge, card do cliente (+WhatsApp), "VOCÊ RECEBE" (líquido após taxa 15%), ações que mudam por status (confirmado → No-show/Concluir).
- **B5 Agenda:** abas Próximos/Pendentes/Concluídos/Cancelados; linhas com hora, monograma, badge, valor.
- **B6 Serviços:** toggles Faço/Não faço por serviço.
- **B7 Disponibilidade:** 7 dias com toggle + faixas de horário + "Salvar".
- **B8 Folgas:** calendário mensal com dias marcados + lista de próximas folgas + "Nova folga".
- **B9 Perfil:** avatar, stats (cortes/rating/no-show), bio, especialidades (chips), galeria.
- **B11 Config:** toggles de notificação + idioma + sair.

### C — Admin Web (`admin-shell.jsx`, `admin-screens-1.jsx`, `admin-screens-2.jsx`)
- **Shell:** sidebar navy (logo + nav + footer da barbearia) + header (título Bebas + ações) + área de conteúdo papel.
- **C1 Dashboard:** 4 KPI cards (receita/bookings/ocupação/no-show com delta), gráfico de barras 30 dias, lista "Próximos · 3h".
- **C2 Barbeiros:** tabela (avatar, função, cortes, rating, status) + "Convidar barbeiro".
- **C3 Convite (modal):** form (nome/email/função) → gera link copiável / enviar email; status "convite pendente".
- **C4 Serviços:** filtros (todos/ativos/inativos/com desconto) + tabela com preço riscado + tag −%.
- **C5 Agenda:** grade semanal (Seg–Sáb × 09–18h) com eventos coloridos por status, filtro de status, popover de detalhe ao clicar.
- **C6 Promoções:** cards com preview do `PromoCard` + modal "Nova promoção" com **preview ao vivo** de como o cliente vê.
- **C7 Relatórios:** filtros (período/barbeiro/serviço) + 3 totais (bruto/comissão 15%/líquido) + tabela + "Exportar CSV".
- **C8 Perfil da barbearia:** form (nome/telefone/endereço/bio) + card de marca (logo + capa).

### D — SaaS dono
- **D1 Landing** (`D1 Landing comercial.html` + `landing-data.js`): nav sticky, hero (headline + mockups schematic), trust strip (4 stats), 6 features, showcase navy dos apps, 3 depoimentos, **pricing com toggle mensal/anual** (Free R$0 / Basic R$49→39 / Pro R$99→79), **FAQ accordion** (6), CTA final, footer.
- **D3–D5 Cadastro** (`owner-flow.jsx`): wizard split (rail navy com 5 macro-passos + barra de progresso vermelha). Inclui D4 (pagamento com 14 dias grátis + form de cartão) e D5 (onboarding: equipe, serviços com templates de preço, horários, "Tudo pronto" com link compartilhável + WhatsApp).

### E — Design System (`Design System.html`, `ds-styles.css`, `ds-data.js`)
Página de referência: nav lateral + seções Cores, Tipografia, Espaçamento, Botões, Inputs, Status Badges, Cards (Appointment/Service/Barber/Barbershop/Promo/BookingPending), Pagamento, Navegação (TopAppBar, BottomTabBar×2, SocialButton), Estados (Empty/Error/Skeleton), Overlays (Modal/BottomSheet/Stepper). **As classes em `ds-styles.css` são a referência canônica de cada componente.**

---

## Interactions & Behavior
- **Navegação:** routers internos por `useState` (sem react-router nos protótipos). Cada app tem uma pilha de histórico simples (`stack.current`) com `nav('__back')`. No codebase real, use a navegação nativa do framework.
- **Transições:** fade/scale sutil (`@keyframes` ~0.2–0.35s ease) na troca de rota/slide. Respeitar `prefers-reduced-motion`.
- **Toasts:** mensagem flutuante no rodapé, ~2.2s, fundo `--ink`/texto `--bg`.
- **Toggles/seleções:** otimistas (atualizam estado local na hora).
- **Pix:** countdown 10min + polling simulado; sucesso auto-navega.
- **Confete (A14):** animação de comemoração one-shot.
- **Pricing/onboarding toggles:** mensal/anual recalcula preços; toggles de dia/serviço atualizam na hora.

## State Management
Por app, o estado mínimo: rota atual + pilha de histórico; dados do agendamento em construção (serviços selecionados, barbeiro, dia/hora) com **cascata** (mudar um passo anterior reseta os seguintes); método de pagamento + aceite de política; no cadastro do dono, um objeto `d` único compartilhado entre todos os passos (owner, shop, plan, cycle, card, barbers[], services[], hours{}). Dados de exemplo estão hardcoded nos componentes — substituir por fetch real.

## Assets
- **Fontes:** Bebas Neue, Lora, Inter — todas Google Fonts (já importadas via `<link>` em cada host).
- **Ícones:** todos inline SVG (stroke, 24×24, `stroke-width` 1.7–2.4). Nenhum asset externo. Substituíveis por uma lib de ícones (ex.: lucide) no codebase.
- **Imagens:** nenhuma foto real — avatares são monogramas coloridos; "fotos"/galerias/mapas são placeholders schematic. No produto, substituir por imagens reais (logo da barbearia, fotos de barbeiros, mapa real).
- **QR Code (A13):** placeholder; gerar QR real do payload Pix no backend.

## Files
**Protótipos navegáveis (comece por aqui):**
- `NAVALHA - Apresentação.html` — capa/hub que linka tudo.
- `Protótipo navegável.html` — app Cliente completo.
- `Barbeiro - Protótipo navegável.html` — app Barbeiro.
- `Admin - Painel da barbearia.html` — Admin web.
- `D1 Landing comercial.html`, `D3 Signup.html` — SaaS do dono.
- `Design System.html` — referência de componentes.

**Componentes de tela (.jsx) — fonte da verdade de medidas/cores:**
Cliente: `onboarding, login, home, search, barbershop, booking-wizard, vintage-checkout, pix-payment, success-screen, appointments, appointment-detail, review, cancel, profile, edit-profile, promos, notifications`.
Barbeiro: `barber-kit, barber-screens-1, barber-screens-2`.
Admin: `admin-shell, admin-screens-1, admin-screens-2`.
SaaS: `owner-flow`, `landing-data.js`.
Design System: `ds-styles.css`, `ds-data.js`.

**Andaime de apresentação (NÃO faz parte do produto):** `ios-frame.jsx`, `browser-window.jsx`, `tweaks-panel.jsx`, `design-canvas.jsx`, `wf-kit.jsx`, `wf-screens.jsx`, `Checkout Wireframes.html`, `Fluxo do cliente.html`.

---

## Recomendações de implementação
1. **Comece pelo Design System** — implemente tokens + componentes base (Button, Input, StatusBadge, Card, EmptyState, etc.) primeiro; todas as telas dependem deles.
2. **Mobile:** Expo + React Native (ou Flutter). Os estilos inline mapeiam bem pra StyleSheet. Atenção ao `line-height` do Bebas (≥1.0).
3. **Web (Admin + Landing):** Next.js + Tailwind ou CSS Modules. O `ds-styles.css` pode virar base de tokens Tailwind.
4. **Status como enum compartilhado** entre cliente/barbeiro/admin (6 estados) com as cores acima.
5. **Acessibilidade:** hit targets ≥44px, contraste (o tema escuro inverte a primária pra dourado), `prefers-reduced-motion`.
