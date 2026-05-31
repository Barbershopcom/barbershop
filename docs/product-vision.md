# Visão de produto — Barbearia SaaS

Documento consolidado pra alinhar dev, designer e qualquer outro
stakeholder que entre no projeto. Lê esse antes de qualquer outro
doc técnico.

---

## 1. O que é

SaaS B2B2C de gestão de barbearias no Brasil. Três camadas:

```
┌─ Plataforma SaaS (B2B) ──────────────┐
│  Dono da barbearia assina um plano,  │
│  cadastra seu negócio, recebe um app │
│  + site customizados                 │
└──────────────────────────────────────┘
              │ deriva
              ▼
┌─ App Business (B2B) ────────────────┐
│  Dono/admin gerencia agenda,        │
│  serviços, equipe.                  │
│  Barbeiro confirma/conclui cortes,  │
│  controla disponibilidade.          │
└─────────────────────────────────────┘
              │ alimenta
              ▼
┌─ App/Site Cliente (B2C) ────────────┐
│  Cliente final agenda corte,        │
│  paga (cartão/Pix), acompanha       │
│  status, avalia.                    │
└─────────────────────────────────────┘
```

---

## 2. Personas

### 2.1 Dono da barbearia (SaaS subscriber)
- Tem 1-5 unidades, 2-20 barbeiros
- Quer mais agendamentos sem precisar gerenciar nada manual
- Topa pagar mensalidade se ROI tá claro
- Não-técnico. Quer onboarding em <10 min

### 2.2 Barbeiro/atendente
- Trabalha em uma barbearia (CLT ou autônomo)
- Quer ver quem chega no dia, confirmar bookings, sacar comissão
- Usa o celular o dia todo

### 2.3 Cliente final
- 18-50 anos, brasileiro, urbano
- Marca corte com barbeiro de preferência, paga online
- Espera UX no nível Uber/iFood: 3 toques pra agendar
- WhatsApp pra dúvidas

---

## 3. Modelo de negócio

| Receita | Como funciona |
|---|---|
| **Assinatura SaaS** | Dono paga mensalidade (Free/Basic/Pro) pra usar a plataforma |
| **Comissão por booking** | % sobre cada agendamento pago via plataforma (~3-7%) |
| **Taxa de pagamento** | Repassa custo de gateway (Mercado Pago: 4.99% cartão, 0.99% Pix) |
| **Carteira (futuro)** | Cliente deposita crédito, paga menos taxa. Dinheiro fica parado conosco (float) |
| **Anúncios destacados (futuro)** | Barbearia paga pra aparecer no topo da home |

Decisão: **gateway = Mercado Pago Brasil** (Pix nativo, melhor pro mercado BR).
Carteira fica pra fase 2 (após validar booking pago).

---

## 4. Diferencial competitivo

| Concorrente | Limite |
|---|---|
| Booksy | Gringo, sem Pix, UX engessada |
| Agendor | Foco corporativo, não barbearia |
| Belezzo | Pequeno, sem mobile decente |
| WhatsApp | Manual, sem agenda, sem pagamento |

Nossa aposta: **Pix integrado + UX mobile-first + barbeiro confirma o booking**
(transmite controle pra ele, evita no-show).

---

## 5. Fluxo macro do cliente

```
Login (ou continuar como guest)
  └── Home
       ├── Promoções da semana
       ├── Seus agendamentos (orders)
       └── Barbeiros em destaque (rating, # cortes)
            └── Seleciona barbearia/barbeiro
                 └── Lista de serviços
                      └── Seleciona serviço(s) + barbeiro
                           └── Picker dia/hora (slots pré-definidos por barbeiro)
                                └── Checkout (Pix / Cartão / Saldo carteira)
                                     └── Status: PENDENTE (aguardando barbeiro)
                                          └── Barbeiro confirma → CONFIRMADO
                                               └── Dia do corte → CONCLUÍDO (após barbeiro marcar)
                                          OU barbeiro não confirma + hora passa → EXPIRADO + reembolso
```

### Regras de status do booking

| Status | Quem pode setar | Permite cancelar? |
|---|---|---|
| `pendente` | Sistema (após pagamento) | Sim, grátis |
| `confirmado` | Barbeiro | Sim, grátis se >1h antes; com taxa se <1h |
| `cancelado` | Cliente ou barbeiro | — |
| `concluído` | Barbeiro (após o corte) | Não |
| `expirado` | Sistema (barbeiro não confirmou + hora passou) | Reembolso automático |

Edição (reschedule) só permitida em `pendente`.

---

## 6. Fluxo macro do barbeiro

```
Login
  └── Home (dashboard)
       ├── Próximos cortes hoje
       └── Pendentes pra confirmar/recusar
            ├── Confirma → vira CONFIRMADO no app do cliente
            └── Recusa → cancelado + cliente reembolsado
       └── Após o corte
            └── Marca como CONCLUÍDO → valor cai na carteira (futuro)
       └── Outros menus
            ├── Meus serviços (marca capabilities)
            ├── Minha disponibilidade (horários por dia da semana)
            ├── Folgas
            ├── Carteira (futuro)
            └── Perfil
```

---

## 7. Fluxo macro do admin da barbearia

Web responsivo (já existe parcialmente):

- Dashboard: receita, agendamentos da semana, ocupação
- Gestão de barbeiros: convidar, editar, remover
- Gestão de serviços: CRUD com preço/duração/desconto
- Agenda: visualizar tudo, criar manual, drag-to-reschedule
- Promoções: CRUD de descontos da semana
- Configuração da barbearia: perfil público (nome, endereço, WhatsApp, Instagram)
- Relatórios financeiros (futuro)

---

## 8. Fluxo macro do dono SaaS (signup do tenant)

```
Landing comercial
  └── Click "Quero teste grátis"
       └── Signup (email + senha + nome da barbearia)
            └── Escolhe plano (Free / Basic / Pro)
                 └── Checkout subscription (Stripe ou MP Subscription)
                      └── Onboarding wizard
                           ├── Nome, endereço, telefone, Instagram
                           ├── Adiciona barbeiros (convite por email)
                           ├── Cadastra serviços
                           ├── Define horários
                           └── Pronto → recebe link `barbearia.app/b/<slug>`
                                └── Compartilha com clientes
```

---

## 9. Onde estamos hoje (Mai/2026)

Stack rodando em produção:
- API NestJS no Railway
- Web Next.js (admin + landing) no Vercel
- Mobile Customer (Expo) — APK gerado pra Android
- Mobile Business (Expo) — em desenvolvimento
- Postgres Neon
- Supabase Auth
- Sentry observability nos 4 apps

Features prontas:
- Multi-tenant com RLS
- Login email+senha
- Booking básico (gratuito, sem pagamento)
- Slots dinâmicos por horário do barbeiro
- Cancel self-service via magic link + push
- Email vintage (4 templates Resend)
- Reagendamento (só admin)
- Reminder 24h antes (email + push)
- Perfil público da barbearia (phone, endereço, Instagram)
- Landing `/b/<slug>` divulgável
- Admin: onboarding, services, team, hours, agenda FullCalendar

Faltam pra alcançar a visão (em ordem de prioridade):
1. Pagamento integrado (Mercado Pago: Pix + cartão)
2. Status `pendente` + workflow barbeiro confirma
3. Reviews/rating + contador de cortes
4. Promoções da semana
5. Home centralizada do cliente com múltiplas barbearias
6. Login social (Google + Apple)
7. Carteira cliente + barbeiro (saque)
8. Self-service signup do dono + Subscription billing

---

## 10. Roadmap proposto

| Sprint | Entrega | Esforço |
|---|---|---|
| **S14** | Mercado Pago integrado + status `pendente` + UI checkout | 6-8 dias |
| **S15** | Barbeiro confirma/recusa + push notifications + expiração automática | 3-4 dias |
| **S16** | Reviews/rating + contador de cortes | 3-4 dias |
| **S17** | Sistema de promoções (admin cria, cliente vê na home) | 4-5 dias |
| **S18** | Home centralizada cliente + busca/listagem de barbearias | 4-5 dias |
| **S19** | Login social (Google + Apple) | 2-3 dias |
| **S20+** | Carteira (cliente + barbeiro), self-service signup do dono, subscription billing | longo |

Total até **MVP monetizado completo**: ~25-30 dias de dev + tempo do designer
em paralelo nas telas (esse doc).

---

## 11. Princípios de produto

1. **Mobile-first sempre.** Web admin pode ser desktop-first. Cliente é
   sempre mobile (Expo + web responsiva).
2. **3 toques pra agendar.** Da home até a confirmação. Cliente que
   precisar de mais um clique vai embora.
3. **Pix domina.** Default no checkout deve ser Pix (taxa mais baixa,
   conversão mais alta no BR).
4. **WhatsApp é canal real.** Email vem segundo. Botão de WhatsApp em
   landing, email e perfil.
5. **Barbeiro tem controle.** O barbeiro confirma o booking — combate
   no-show e dá poder pro lado da operação.
6. **Visual vintage barber.** Email já segue (Bebas Neue + Lora + paleta
   navy/red/papel). Manter consistência em landing e app.
7. **LGPD-friendly.** Sentry scrubba PII, dados pessoais nunca em logs.

---

## 12. Brand palette (referência rápida pra designer)

| Cor | Hex | Uso |
|---|---|---|
| Navy | `#1a365d` | Primary, headers, CTAs |
| Vermelho | `#bf212f` | Acentos, alertas, status crítico |
| Dourado | `#c5a059` | Acentos premium |
| Papel | `#fffcf5` | Background warm |
| Tinta | `#1c1917` | Texto principal |
| Cinza fraco | `rgba(0,0,0,0.4)` | Texto secundário |

Tipografia:
- **Bebas Neue** — display (logos, badges, CTAs grandes)
- **Lora** — body italic + roman (texto descritivo, headlines)
- **Inter / system** — UI (forms, dados tabulares, micro-texto)

Já aplicado em emails vintage (4 templates). Designer pode estender
pro app/web.

---

## 13. Próximos passos pro designer

1. Ler esse doc primeiro
2. Conferir `docs/screens-spec.md` — lista detalhada de telas necessárias
3. Olhar emails atuais em `apps/api/src/email/templates.ts` pra absorver a estética
4. Olhar landing pública em `https://barbershop-web-chi.vercel.app/b/barbearia-do-jaja` pra ver UI atual
5. Brainstorm conjunto sobre prioridade das telas (S14 = pagamento → começa pelas telas de checkout)
