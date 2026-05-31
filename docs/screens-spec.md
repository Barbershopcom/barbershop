# Spec de telas — pra designer

Lista de telas que precisam ser desenhadas, agrupadas por persona +
plataforma. Pra cada tela: propósito, componentes, estados,
wireframe textual e interações chave.

Lê primeiro [`product-vision.md`](./product-vision.md) pra entender o
contexto de negócio.

---

## Convenções

- **Plataforma**: 📱 mobile (Expo) | 🌐 web (Next.js) | 📱🌐 ambos
- **Estados padrão**: `loading`, `empty`, `error`, `success`. Quando não menciono, assume os 4.
- **Componentes reusáveis** marcados em **`<NomeComponente>`** — listados no fim
- **Brand palette + tipografia**: ver `product-vision.md §12`

---

## A. Cliente

### A1 — Splash 📱

**Propósito**: tela inicial em <1s, esconde checagem de auth.

**Componentes**: logo centralizado + barber pole stripe (mesmo do email).

**Wireframe textual**:
```
┌─────────────────────┐
│                     │
│      [LOGO]         │
│                     │
│   ▓▓▓▓▓▓▓▓▓▓▓▓     │ ← stripe vintage
└─────────────────────┘
```

**Próxima tela**: A2 (não logado) ou A6 (logado).

---

### A2 — Login 📱🌐

**Propósito**: autenticar com email+senha. Fallback pra signup ou login social.

**Componentes**:
- Logo no topo
- **`<Input>`** email
- **`<Input>`** senha (com toggle de mostrar)
- **`<Button>`** "Entrar" (primary, navy)
- Link "Esqueci a senha"
- Divider "ou continue com"
- **`<SocialButton>`** Google, Apple (Facebook futuro)
- Link "Criar conta" no rodapé

**Estados**:
- Loading (botão com spinner durante signin)
- Error (mensagem inline embaixo do form: "Email ou senha incorretos")

**Wireframe textual**:
```
┌─────────────────────┐
│      [LOGO]         │
│                     │
│  ENTRAR             │
│  Faça login pra continuar
│                     │
│  Email              │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  Senha          👁  │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│  Esqueci a senha →  │
│                     │
│  ┌───────────────┐  │
│  │   ENTRAR      │  │ ← navy bg
│  └───────────────┘  │
│                     │
│  ── ou continue com ──
│  [G] Google         │
│  [] Apple           │
│                     │
│  Não tem conta? Criar
└─────────────────────┘
```

**Próximas telas**: A6 (sucesso), A3 (signup), A4 (reset).

---

### A3 — Signup 📱🌐

**Propósito**: criar conta nova.

**Componentes**:
- Nome completo, Email, Telefone (formato BR), Senha, Confirmar senha
- Checkbox "Aceito Termos e Política de Privacidade"
- **`<Button>`** "Criar conta"
- Link voltar pra login

**Validação inline**: força de senha (fraca/média/forte), email válido,
telefone E.164.

---

### A4 — Reset password 📱🌐

**Propósito**: enviar email de redefinição.

**Componentes**: input email + botão "Enviar link" + sucesso ("Confira seu inbox").

---

### A5 — Onboarding (primeira vez) 📱

**Propósito**: 2-3 telas explicando o app na primeira abertura.

**Componentes**: ilustração + título + sub + dots de progresso + skip.

**Conteúdo sugerido**:
1. "Agende com seu barbeiro favorito"
2. "Pague com Pix em segundos"
3. "Receba lembrete antes do horário"

---

### A6 — Home cliente 📱

**Propósito**: tela principal. Centraliza descoberta, histórico e CTA de agendamento.

**Componentes**:
- Header com avatar + nome + sino de notificações
- Saudação ("Bom dia, João 👋")
- **Seção `Promoções da semana`**
  - Lista horizontal scroll de **`<PromoCard>`**
  - Vê tudo →
- **Seção `Seus agendamentos`**
  - 1-2 **`<AppointmentCard>`** mais recentes
  - Ver todos →
- **Seção `Barbeiros em destaque`**
  - Lista horizontal scroll de **`<BarberCard>`**
  - Cada card: foto, nome, "Barbeiro na Barbearia X", # cortes, estrelas
- Bottom tab nav: Home, Buscar, Agendamentos, Carteira (futuro), Perfil

**Estados**:
- Empty (no promo / no orders): mostrar CTA "Encontrar barbearia"
- Loading: skeletons de cards

**Wireframe textual**:
```
┌─────────────────────┐
│ 👤 João da Silva  🔔│
│                     │
│ Bom dia, João! 👋   │
│                     │
│ 🎁 PROMOÇÕES DA SEMANA  →
│ ┌───┐ ┌───┐ ┌───┐   │
│ │ A │ │ B │ │ C │   │
│ └───┘ └───┘ └───┘   │
│                     │
│ 📅 SEUS AGENDAMENTOS  →
│ ┌─────────────────┐ │
│ │ Hoje 14:00      │ │ ← AppointmentCard
│ │ Corte com Jaja  │ │
│ │ ● CONFIRMADO    │ │
│ └─────────────────┘ │
│                     │
│ ✂️ BARBEIROS EM DESTAQUE
│ ┌───┐ ┌───┐ ┌───┐   │
│ │👤A│ │👤B│ │👤C│   │ ← BarberCard
│ │⭐4.8│ │⭐4.6│ │⭐4.9│
│ └───┘ └───┘ └───┘   │
│                     │
│ ─────────────────── │
│ 🏠  🔍  📅  💰  👤  │ ← bottom tab
└─────────────────────┘
```

**Próximas telas**: A7 (busca), A8 (página barbearia ao clicar PromoCard ou BarberCard), A14 (lista agendamentos).

---

### A7 — Busca de barbearias 📱

**Propósito**: encontrar barbearia por nome, endereço ou perto de você.

**Componentes**:
- Search bar com placeholder "Nome da barbearia ou bairro"
- Filtros chips: Próximas, Mais avaliadas, Promoções
- Lista vertical de **`<BarbershopCard>`** (foto, nome, endereço, rating, # de barbeiros)

**Estados**:
- Empty (nenhum resultado): "Nada encontrado. Tenta outro termo."

---

### A8 — Página da barbearia 📱🌐

**Propósito**: catálogo + perfil público + CTA agendar.

> Substitui a `/b/[slug]` atual com versão mais rica.

**Componentes**:
- Header com banner foto + logo + nome + endereço
- Botão WhatsApp + Instagram + Telefone (clickable)
- Tabs: Serviços (default) | Barbeiros | Avaliações | Info
- **Tab Serviços**: lista de **`<ServiceCard>`** com nome, duração, preço, %desconto (se houver), barbeiros que fazem
- **Tab Barbeiros**: lista de **`<BarberDetailCard>`** com foto, nome, rating, # cortes, especialidades
- **Tab Avaliações**: lista de reviews recentes (rating + texto + cliente + data)
- **Tab Info**: endereço + mapa + horário funcionamento + redes sociais

**CTA fixo no rodapé**: "Agendar agora" (navy button)

---

### A9 — Lista de serviços (catálogo) 📱

**Propósito**: cliente escolhe um ou mais serviços.

> Pode ser a Tab Serviços da A8 ou tela dedicada se vier de uma promo.

**Componentes**: **`<ServiceCard>`** com:
- Nome do serviço
- Duração (ex: "30 min")
- Barbeiros que fazem (avatares pequenos)
- Preço original (riscado se promo)
- Preço final + tag de desconto (ex: "-20%")
- Botão "Selecionar" (toggle se múltiplo)

**Suporte a múltiplos serviços**: cliente pode selecionar 2-3 e fazer "combo".

---

### A10 — Seleção de barbeiro 📱

**Propósito**: escolher quem vai fazer o(s) serviço(s).

**Componentes**: lista de barbeiros COM o serviço selecionado em comum.
- Avatar + nome + rating + # cortes
- Opção "Qualquer barbeiro disponível"
- Badge "Próxima disponibilidade: amanhã 14h" (mini-hint)

---

### A11 — Picker dia/hora 📱

**Propósito**: escolher slot de horário.

**Componentes**:
- Calendar (react-native-calendars) com dias disponíveis marcados
- Abaixo: grid de chips de horário disponíveis pro dia selecionado
- Slots vêm da API `/public/tenants/:slug/slots` (já existe)
- Header sticky: resumo (serviço + barbeiro + preço total)

**Wireframe textual**:
```
┌─────────────────────┐
│ ← Corte + Barba     │
│   com Jaja  R$ 80   │
│                     │
│  Maio 2026   < >    │
│  D S T Q Q S S      │
│        1 2 3        │
│  4 5 6 7 8 9 10    │
│  11•12 13●14 15•16  │
│  18 19 20 21 22...  │
│                     │
│  Horários quarta 14 │
│  ┌──┐ ┌──┐ ┌──┐    │
│  │09│ │09│ │10│    │
│  │00│ │40│ │20│    │
│  └──┘ └──┘ └──┘    │
│  ┌──┐ ┌──┐ ┌──┐    │
│  │11│ │11│ │12│    │
│  │00│ │40│ │20│    │
│  └──┘ └──┘ └──┘    │
│                     │
│  ┌─────────────┐    │
│  │  CONTINUAR  │    │
│  └─────────────┘    │
└─────────────────────┘
```

**Estados**:
- Slots vazios: "Sem horários disponíveis nesse dia. Tenta outro."

---

### A12 — Checkout / pagamento 📱

**Propósito**: revisar booking + escolher método + pagar.

**Componentes**:
- Resumo do pedido (serviço, barbeiro, data/hora, barbearia)
- Subtotal + desconto + total
- **`<PaymentMethodSelector>`** — 4 opções:
  - 💳 Cartão de crédito (com sub-opção parcelamento)
  - 💳 Cartão de débito
  - 🟢 Pix (highlight como recomendado — taxa menor)
  - 💰 Saldo da carteira (cinza/disabled na fase 1)
- Cada método mostra a taxa ao lado ("+R$ 4 com cartão", "Grátis com Pix")
- Total final atualiza ao trocar método
- Checkbox aceito políticas de cancelamento
- **`<Button>`** "Confirmar e pagar R$ XX,XX"

**Estados**:
- Loading durante chamada do gateway
- Erro: "Pagamento recusado. Tenta outro método ou outro cartão."

---

### A13 — Processando pagamento 📱

**Propósito**: feedback durante chamada do Mercado Pago.

**Componentes**:
- Spinner + texto "Aguarde..."
- Se for Pix: mostra QR code + código pra copiar + countdown 10 min

**Pix flow**:
- Cliente vê QR code
- Abre app do banco, escaneia, paga
- App polling backend pra detectar pagamento
- Ao detectar: navega pra A14 (sucesso)
- Timeout 10 min → mostra "Pagamento expirou. Tentar de novo?"

---

### A14 — Sucesso do agendamento 📱

**Propósito**: confirmar booking, mostrar status pendente.

**Componentes**:
- Ícone de check + animação celebratória
- Texto: "Tudo certo! Seu pedido está aguardando confirmação do barbeiro"
- Card com resumo do booking (data/hora/serviço/barbeiro/preço)
- Badge status: **PENDENTE** (amarelo)
- Texto explicativo: "Você receberá uma notificação quando o barbeiro confirmar (geralmente em até 1h)"
- **`<Button>`** "Ver meus agendamentos" → A15
- **`<Button secondary>`** "Voltar pra home" → A6

---

### A15 — Lista de agendamentos 📱

**Propósito**: histórico + agendamentos ativos.

**Componentes**:
- Tabs: Próximos | Histórico
- **`<AppointmentCard>`** com:
  - Data/hora
  - Serviço + barbeiro
  - Barbearia
  - Badge status (cor por status: amarelo pendente, navy confirmado, verde concluído, cinza cancelado, vermelho expirado)
  - Preço pago
  - Ações (editar/cancelar) conforme regras

**Estados**:
- Empty próximos: "Sem agendamentos. Que tal marcar um corte?" + CTA
- Empty histórico: ícone + texto

---

### A16 — Detalhe do agendamento 📱

**Propósito**: ver tudo do booking + ações.

**Componentes**:
- Header com badge status grande
- Card: data/hora, serviço, barbeiro (com avatar), barbearia (com endereço + mapa mini)
- Pagamento: método usado + valor + ID transação
- Histórico de status (timeline):
  - 14:32 Criado (pendente)
  - 14:45 Confirmado pelo barbeiro
  - (Hoje 15:00) Concluído
- Botões de ação:
  - Se pendente: **Editar** + **Cancelar** (grátis)
  - Se confirmado >1h antes: **Cancelar** (grátis)
  - Se confirmado <1h antes: **Cancelar** (com aviso de taxa)
  - Se concluído: **Avaliar** (entra em A17) + **Repetir agendamento**
- **`<Button>`** Chamar barbearia no WhatsApp

---

### A17 — Avaliar atendimento 📱

**Propósito**: cliente dá rating + comentário pós-corte.

**Componentes**:
- 5 estrelas (tap)
- Tags pré-definidas (chips): "Pontual", "Atencioso", "Boa conversa", "Pediu mais", "Bom corte", etc — pode marcar várias
- Textarea opcional pra comentário
- **`<Button>`** "Enviar avaliação"
- Skip → "Avaliar depois"

---

### A18 — Cancelar agendamento 📱

**Propósito**: confirmar cancelamento + mostrar taxa se aplicável.

**Componentes**:
- Aviso visual: ícone + texto
- Se grátis: "Você pode cancelar grátis. Tem certeza?"
- Se com taxa: "Cancelar agora cobra R$ 10 (50% do valor). Tem certeza?"
- Razão opcional (textarea ou chips: "Imprevisto", "Mudei de ideia", "Outro")
- Botões: Confirmar cancelamento (vermelho destructive) | Voltar

---

### A19 — Perfil cliente 📱

**Propósito**: ver/editar dados.

**Componentes**:
- Avatar + nome (clicável pra editar)
- Email, telefone, data nascimento (opcional)
- Endereço (pra geo-search futura — opcional)
- Menu:
  - Editar perfil
  - Endereços salvos
  - Métodos de pagamento salvos
  - Notificações (toggles)
  - Privacidade
  - Suporte/WhatsApp
  - Sair

---

### A20 — Editar perfil 📱

**Propósito**: editar dados básicos.

**Componentes**: form com mesmos campos do signup + upload de foto.

---

### A21 — Carteira (FUTURO) 📱

**Propósito**: ver saldo + transações + depositar.

**Componentes**:
- Card grande: "Saldo disponível: R$ XX,XX"
- Badge "Você economiza X% pagando com saldo"
- **`<Button>`** "Depositar"
- Lista de transações (entrada/saída com filtros)

---

### A22 — Promoções (lista expandida) 📱

**Propósito**: ver todas promoções ativas.

**Componentes**: lista vertical de **`<PromoCard>`** com:
- Imagem
- Título
- Desconto (ex: "30% OFF")
- Vigência (ex: "Até domingo")
- Barbearia/barbeiro associado
- CTA "Ver detalhes" → A8 da barbearia

---

### A23 — Notificações 📱

**Propósito**: ver histórico de pushes recebidos.

**Componentes**:
- Lista cronológica de notificações (lembrete de booking, confirmação do barbeiro, promoção, etc.)
- Badge "novo" em não lidas

---

## B. Barbeiro

### B1 — Login barbeiro 📱

> Reusa o design de A2 (mesma tela).

Após login, sistema detecta que é barbeiro (Employee linked) → roteia pra B2.

---

### B2 — Home/Dashboard barbeiro 📱

**Propósito**: visão do dia + pendentes.

**Componentes**:
- Header com avatar + nome + sino
- Saudação
- **Seção `Hoje`**:
  - Resumo: "Você tem X cortes hoje. Próximo às 14h"
  - Lista vertical compacta de bookings de hoje
- **Seção `Pendentes`** (urgência alta, destaque):
  - **`<BookingPendingCard>`** com botões Confirmar (verde) + Recusar (cinza)
  - Se >5 pendentes: "Ver todos →"
- **Seção `Carteira`** (futuro):
  - Saldo atual + CTA "Sacar"

**Wireframe textual**:
```
┌─────────────────────┐
│ 👤 Jaja          🔔 │
│ Olá, Jaja!          │
│                     │
│ 📋 HOJE             │
│ Você tem 8 cortes   │
│ Próximo: 14:00      │
│ ┌─────────────────┐ │
│ │ 14:00           │ │
│ │ João — Corte    │ │
│ ├─────────────────┤ │
│ │ 15:00           │ │
│ │ Pedro — Barba   │ │
│ └─────────────────┘ │
│                     │
│ ⏰ PENDENTES (3)    │
│ ┌─────────────────┐ │
│ │ Amanhã 10h      │ │
│ │ Maria — Corte   │ │
│ │ [✓] [✗]         │ │ ← Confirmar/Recusar
│ └─────────────────┘ │
│ Ver todos →         │
│                     │
│ 💰 CARTEIRA         │
│ Saldo: R$ 240,00    │
│ [SACAR]             │
│                     │
│ ─────────────────── │
│ 🏠 📋 ⚙️ 👤         │
└─────────────────────┘
```

---

### B3 — Lista pendentes 📱

**Propósito**: tela dedicada pra confirmar/recusar.

**Componentes**: lista vertical de **`<BookingPendingCard>`** com:
- Data/hora
- Cliente (nome)
- Serviço(s)
- Valor que vai entrar
- Botões: Confirmar / Recusar
- Botão "Detalhes" → B4

---

### B4 — Detalhe booking (visão barbeiro) 📱

**Propósito**: ver detalhes + ações por status.

**Componentes**:
- Resumo do booking
- Cliente (nome + telefone clicável → WhatsApp)
- Serviços + duração total + preço
- Por status:
  - **Pendente**: Confirmar (verde) | Recusar (cinza)
  - **Confirmado**: Marcar como concluído | Marcar como no-show | Reagendar
  - **Concluído**: Ver avaliação (se cliente avaliou)
- Mapa do bairro (caso cliente venha de longe — opcional)

---

### B5 — Lista todos agendamentos 📱

**Propósito**: histórico + filtros.

**Componentes**: tabs por status (Próximos / Pendentes / Concluídos / Cancelados) + lista.

---

### B6 — Meus serviços 📱

**Propósito**: barbeiro marca quais serviços faz (capability).

**Componentes**:
- Lista de serviços da barbearia (vem de `BarberServiceCapability`)
- Cada item com toggle: Faço ✓ / Não faço
- Estado salvo no toggle (otimista, com revert em erro)

---

### B7 — Minha disponibilidade (horários) 📱

**Propósito**: barbeiro define `BarberSchedule` por dia da semana.

**Componentes**:
- Lista 7 dias (Dom a Sáb)
- Cada dia:
  - Toggle "Trabalho neste dia"
  - Se sim: grupos de horários (ex: 09:00-12:00 e 14:00-19:00)
  - Botão "+ Adicionar intervalo"
- Botão "Salvar" no rodapé

---

### B8 — Folgas (TimeOff) 📱

**Propósito**: marcar dias específicos de folga.

**Componentes**:
- Calendar com folgas atuais marcadas (vermelho)
- Botão "+ Nova folga"
- Lista de folgas futuras (com botão excluir cada)

---

### B9 — Perfil barbeiro 📱

**Propósito**: ver/editar dados profissionais.

**Componentes**:
- Avatar + nome + função
- Stats: # cortes feitos, rating médio, % no-show, etc
- Bio curta
- Especialidades (chips)
- Foto galeria de trabalhos
- Editar →

---

### B10 — Carteira barbeiro (FUTURO) 📱

**Propósito**: saldo, histórico, saque.

**Componentes**:
- Saldo disponível
- "Hoje você ganhou R$ XX"
- **`<Button>`** "Sacar agora (taxa R$ X)"
- **`<Button>`** "Sacar amanhã (grátis)"
- Lista de transações (corte feito, taxa cobrada, saque)

---

### B11 — Configurações 📱

**Propósito**: notificações, idioma, logout.

---

## C. Admin barbearia

### C1 — Dashboard admin 🌐

**Propósito**: KPIs do negócio.

**Componentes**:
- 4 cards no topo: Receita do dia, Bookings da semana, Ocupação média, Taxa de no-show
- Gráfico: receita últimos 30 dias
- Lista: próximos bookings (próximas 3h)

---

### C2 — Gestão de barbeiros 🌐

**Já existe** em `/admin/team`. Refinamentos:
- Botão "Convidar barbeiro" gera link mágico ou envia email
- Coluna de stats (# cortes, rating)
- Ação "Ver agenda do barbeiro" → modal

---

### C3 — Convite barbeiro 🌐

**Propósito**: gerar acesso pra barbeiro novo.

**Componentes**:
- Form: nome, email, role (admin_barber / barber)
- Após criar: copia link de convite ou manda email
- Pendente até barbeiro aceitar (status no listing)

---

### C4 — Gestão de serviços 🌐

**Já existe** em `/admin/services`. Refinamentos:
- Adicionar campo "% desconto" (precisa nova migração)
- Validade do desconto (datas)
- Tag visual em servicos com desconto ativo
- Filtros: ativos/inativos/com desconto

---

### C5 — Agenda 🌐

**Já existe** em `/admin/agenda` (FullCalendar). Refinamentos:
- Mostrar status com cores (pendente amarelo, confirmado navy, concluído verde)
- Filtro por status
- Card de detalhe ao clicar evento

---

### C6 — Promoções 🌐

**Propósito**: admin cria promoções da semana.

**Componentes**:
- Lista de promoções (ativas/inativas)
- Botão "+ Nova promoção"
- Form modal:
  - Título
  - Descrição
  - Tipo: % desconto, valor fixo, brinde
  - Aplicação: todos serviços, serviço específico, barbeiro específico
  - Vigência (datas início/fim)
  - Imagem (upload)
- Preview do card como vai aparecer pro cliente

---

### C7 — Relatórios financeiros 🌐

**Propósito**: ver receita, comissão, repasses.

**Componentes**:
- Filtros: período, barbeiro, serviço
- Tabela: bookings + valores + taxas + comissão da plataforma + líquido pro barbeiro
- Botão "Exportar CSV"

---

### C8 — Perfil da barbearia 🌐

**Já existe** em `/admin/perfil` (Sprint 11). Sem mudanças.

---

## D. SaaS owner (dono da barbearia se cadastrando)

### D1 — Landing comercial 🌐

**Propósito**: vender o SaaS pra novos donos.

**Componentes**:
- Hero: headline + sub + CTA "Teste grátis 14 dias"
- Seção features (3-4 cards com ícones)
- Seção depoimentos (logos/quotes)
- Seção pricing (3 planos lado a lado)
- FAQ
- Footer

**Tom**: vintage barber + profissional. Mostra screenshots dos apps.

---

### D2 — Pricing/Planos 🌐

**Propósito**: comparar planos.

**Componentes**: tabela 3 colunas (Free / Basic / Pro) com:
- Preço/mês
- Features incluídas (checkmarks)
- Limite de barbeiros, bookings, etc
- CTA "Começar" em cada coluna

---

### D3 — Signup self-service 🌐

**Propósito**: criar conta + barbearia em 1 fluxo.

**Componentes**: wizard de 3-4 steps:
1. Dados do dono (nome, email, senha)
2. Dados da barbearia (nome, endereço, telefone, slug auto)
3. Plano escolhido (vem da D2)
4. Pagamento (Stripe/MP Subscription)

---

### D4 — Checkout subscription 🌐

**Propósito**: pagar primeira mensalidade.

**Componentes**: form de cartão + escolha de período (mensal/anual com desconto).

---

### D5 — Onboarding wizard 🌐

**Propósito**: 4-5 telas guiando setup inicial após signup.

**Componentes**:
1. "Bem-vindo!" — explicação
2. Adiciona barbeiros (skip permitido)
3. Cadastra serviços (templates pré-prontos: Corte clássico, Barba, etc — só ajusta preço)
4. Define horários da barbearia
5. "Pronto! Aqui está seu link: `barbearia.app/b/sua-barbearia`" — botões compartilhar (WhatsApp, copiar)

---

## E. Componentes reusáveis

Lista pro designer construir um Design System:

| Componente | Onde aparece | Variações |
|---|---|---|
| `<Button>` | Em todo lugar | Primary (navy), Secondary (outlined), Destructive (red), Ghost (text), com loading state |
| `<Input>` | Forms | Default, password (com toggle), tel (com máscara BR), email, with error |
| `<Card>` | Genérico | Base + variações abaixo |
| `<AppointmentCard>` | Listas de bookings | Por status (cores) |
| `<ServiceCard>` | Catálogo | Com/sem desconto |
| `<BarberCard>` | Home destaque + listas | Compacto / expandido |
| `<BarberDetailCard>` | Tab barbeiros da barbearia | Com rating + stats |
| `<BarbershopCard>` | Busca de barbearias | — |
| `<PromoCard>` | Home + lista promoções | — |
| `<BookingPendingCard>` | Barbeiro home + lista pendentes | Com botões confirm/refuse |
| `<PaymentMethodSelector>` | Checkout | — |
| `<StatusBadge>` | Onde aparece status | 6 variações (pendente, confirmado, etc) |
| `<EmptyState>` | Listas vazias | Ícone + texto + CTA |
| `<ErrorState>` | Erros de rede | — |
| `<SkeletonLoader>` | Loading de listas | — |
| `<SocialButton>` | Login | Google, Apple, Facebook |
| `<BottomTabBar>` | Mobile customer | 5 tabs |
| `<BottomTabBar>` | Mobile barbeiro | 4 tabs |
| `<TopAppBar>` | Mobile | Com back, title, actions |
| `<Modal>` / `<BottomSheet>` | Forms e confirms | — |
| `<Stepper>` | Wizards (onboarding) | — |

---

## F. Decisões UX importantes

1. **Bottom tabs em mobile**: 4-5 tabs max. Cliente: Home, Buscar, Agendamentos, (Carteira), Perfil. Barbeiro: Home, Agenda, Config, Perfil.

2. **Floating CTA**: na tela da barbearia (A8), o botão "Agendar agora" fica sticky no fundo da tela, não no header.

3. **Cores de status**:
   - Pendente: amarelo `#F59E0B`
   - Confirmado: navy `#1a365d`
   - Concluído: verde `#10B981`
   - Cancelado: cinza `#94A3B8`
   - Expirado: vermelho `#bf212f` (mesmo do brand)
   - No-show: âmbar `#D97706`

4. **Pix em destaque**: no checkout, Pix vem primeiro com badge "Recomendado" (taxa menor).

5. **Tempo de slot**: ~40 min é o padrão observado nas barbearias. Configurável pelo admin nos serviços (`durationMin` + `bufferMin`).

6. **Avaliação após corte**: dispara push 1h após o horário do corte ("Como foi seu corte com Jaja? Avaliar"). Não no momento do checkout.

7. **Cancelamento com taxa**: regra simples — grátis se >1h antes do horário; 50% do valor se <1h.

8. **Reschedule pelo cliente**: só permitido se status `pendente`. Após confirmado, só admin/barbeiro reagenda. Evita abuso.

9. **Login social**: começa com Google + Apple. Facebook só se aparecer demanda real (volume baixo no segmento).

10. **Foto do barbeiro**: importante pra confiança. Designer prevê space pra foto em vários componentes.

---

## G. Roadmap de telas por Sprint

Priorização pra designer começar com o que vai ser usado em código primeiro:

| Sprint | Telas a desenhar |
|---|---|
| **S14** (pagamento) | A12, A13, A14, A15 (refinar), A16, A18 (cancelar com taxa), `<PaymentMethodSelector>`, `<StatusBadge>` |
| **S15** (barbeiro confirma) | B2, B3, B4, `<BookingPendingCard>` |
| **S16** (reviews) | A17, `<BarberCard>` com rating, `<BarberDetailCard>` |
| **S17** (promoções) | A22, C6, `<PromoCard>` |
| **S18** (home cliente) | A6, A7, A8 (refinar), `<BarbershopCard>` |
| **S19** (login social) | A2 (refinar com botões sociais), `<SocialButton>` |
| **Sx (futuro)** | Restante (carteira, signup self-service, etc) |

---

## H. Próximos passos pro designer

1. Lê `docs/product-vision.md` pra entender contexto
2. Lê esse spec por completo, anota dúvidas
3. Constrói Design System primeiro (paleta, tipo, componentes E)
4. Começa pelas telas de **S14** (pagamento) — mais críticas
5. Itera com dev em ciclos de 2-3 telas por vez
6. Usa Figma com auto-layout pra facilitar handoff

**Stack sugerida pra designer**:
- Figma + Figma Tokens
- Lottie pra animações de sucesso (A14)
- React Native screen sizes: 375x812 (base iPhone), 414x896 (base Android)
- Web admin: desktop-first 1280x800
- Web landing: responsiva (mobile 375 → desktop 1440)
