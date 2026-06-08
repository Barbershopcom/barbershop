# NAVALHA — Prompt de Kickoff para Claude Code (Council + Implementação)

> Cole este conteúdo no Claude Code, com a pasta `design_handoff_navalha/` na raiz do repositório (ou aponte o caminho dela). O fluxo tem **2 fases**: primeiro o **Council** analisa/critica; só depois vem o **plano e a implementação**.

---

Você é o engenheiro-líder encarregado de transformar o pacote de design **NAVALHA** (plataforma SaaS de barbearia brasileira) em um produto real. Antes de escrever **qualquer** linha de código, leia o material e conduza um **Council** de revisão.

## Material de entrada (leia tudo primeiro)
- `design_handoff_navalha/README.md` — documentação completa: tokens, rotas, telas, interações, estado, assets, recomendações de stack.
- `design_handoff_navalha/prototypes/*.html` — 7 protótipos navegáveis (capa, app Cliente, app Barbeiro, Admin web, Landing, Cadastro do dono, Design System).
- `design_handoff_navalha/components/*` — fontes `.jsx/.js/.css` (a **verdade** de medidas/cores). O andaime de apresentação está isolado em `components/_scaffold/` e **não** faz parte do produto.

São 4 frentes + design system: **App Cliente (mobile)**, **App Barbeiro (mobile)**, **Admin (web)**, **SaaS do dono (landing + cadastro)** e o **Design System**.

---

## FASE 1 — COUNCIL (análise antes de codar)

Convoque uma mesa de **7 especialistas**. Cada um analisa o pacote pela sua lente, **em primeira pessoa**, e produz: (a) leitura do que existe, (b) riscos e lacunas, (c) decisões que precisam ser tomadas, (d) recomendações priorizadas. Seja crítico e específico — aponte conflitos entre as visões.

1. **Arquiteto de Software** — monorepo vs repos separados; como compartilhar o design system e os tipos (ex.: enum de status) entre mobile e web; estratégia de API (REST/GraphQL/tRPC); estrutura de pastas.
2. **Engenheiro Mobile (Expo/React Native)** — como mapear os estilos inline → StyleSheet/tokens; navegação (expo-router); a pegadinha do `line-height` do Bebas Neue; gestão de fontes; performance de listas.
3. **Engenheiro Web (Next.js)** — Admin + Landing; SSR/SSG; como portar `ds-styles.css` pra tokens de Tailwind/CSS Modules; tabelas/gráficos do dashboard; SEO da landing.
4. **Engenheiro Backend / Pagamentos** — modelagem de dados (barbearia, barbeiro, serviço, agendamento, status, assinatura); **Pix** (geração de QR/copia-e-cola, webhook de confirmação, expiração 10min), cartão/parcelamento, assinatura SaaS (Stripe/Mercado Pago); repasse e comissão (15%); multi-tenant.
5. **Especialista em Design System** — quais componentes viram primitivos (Button, Input, StatusBadge, Card, EmptyState, TabBar, Stepper…); tokens (3 temas: claro/escuro/admin); naming; estratégia de tema (CSS vars vs theme provider); como evitar divergência entre as 4 frentes.
6. **Produto / UX** — coerência dos fluxos; estados vazios/erro/loading; acessibilidade (hit target ≥44px, contraste, prefers-reduced-motion); i18n (pt-BR agora, escalável?); o que é MVP vs. depois.
7. **QA / Segurança** — superfícies de risco (auth, multi-tenant isolation, dados de pagamento, LGPD); estratégia de testes (unit/e2e); o que validar primeiro.

### Entregáveis da Fase 1 (não escreva código ainda)
1. **Ata do Council** — resumo de cada especialista (bullets).
2. **Matriz de decisões** — tabela: Decisão | Opções | Recomendação | Trade-offs (ex.: stack, monorepo, API, gateway de pagamento).
3. **Riscos & lacunas** — o que falta no design pra virar produto (ex.: backend, regras de negócio, QR real, mapa real, fotos).
4. **Perguntas abertas** pra mim (o dono do produto) responder antes de prosseguir.
5. **Roadmap em fases** — começando **sempre pelo Design System/tokens**, depois um fluxo vertical fim-a-fim (sugestão: agendar→pagar→confirmar) antes de espalhar.

**PARE aqui e me apresente a Fase 1.** Só siga pra implementação após meu OK e respostas às perguntas abertas.

---

## FASE 2 — IMPLEMENTAÇÃO (após aprovação)
Quando eu aprovar:
1. Implemente **primeiro o Design System** (tokens + componentes base) — tudo depende dele.
2. Depois **um fluxo vertical** completo e funcional antes de espalhar pras outras telas.
3. **Fidelidade alta:** respeite cores, tipografia, espaçamento e raios do README/fontes. Recrie os designs nos padrões do framework escolhido — **não** copie o HTML/Babel dos protótipos direto, nem inclua o andaime `_scaffold/`.
4. Substitua dados mockados por camada de dados real; deixe placeholders óbvios onde faltar backend.
5. Trabalhe em incrementos pequenos e verificáveis; ao fim de cada fase, mostre o que roda e o que falta.

## Regras
- **Nada de código na Fase 1.** Análise primeiro.
- Use o `README.md` como fonte canônica; quando precisar de medida/cor exata, abra o `.jsx` correspondente.
- Sinalize qualquer suposição que você for forçado a fazer.
- Português (pt-BR) na UI; código e comentários podem ser em inglês.

Comece lendo o pacote e conduzindo a **Fase 1 — Council**.
