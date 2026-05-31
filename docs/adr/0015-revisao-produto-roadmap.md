# ADR-015: Revisão de produto + roadmap consolidado

- **Data:** 2026-05-31
- **Status:** Aprovado
- **Supersedes:** partes de ADR-004 (slots) e ADR-005 (fee); revisa visão de ADR-001
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Após 13 sprints, o produto está em **produção** (API no Railway, web no
Vercel, mobile via EAS, observability Sentry). A fundação técnica está
~95% pronta. Mas a **visão de produto evoluiu** desde os ADRs originais
e passou a incluir: contas de cliente, workflow de status com
confirmação do barbeiro, pagamento online, reviews, promoções, home
centralizada e (futuro) carteira.

Este ADR consolida o inventário real, resolve as divergências entre a
visão nova e os ADRs antigos, e define o roadmap do estado atual até
produto vendável.

---

## Inventário — onde estamos (Mai/2026)

**Pronto e em produção:**
- Monorepo Turborepo (4 apps + 6 packages)
- Multi-tenancy + RLS (testado)
- Auth email+senha (Supabase) — 401/me RESOLVIDO
- Deploy Railway (API) + Vercel (web) + EAS (mobile) — FEITO
- Sentry observability (4 projetos)
- Backend: onboarding, services, employees, hours, schedule, slots,
  booking público, cancel self-service, reschedule (admin), reminder 24h,
  tenant profile, email vintage (4 templates)
- Web admin: agenda (FullCalendar), services, team, hours, perfil
- Web público: `/b/[slug]` booking completo
- Mobile customer: booking guest completo
- Mobile business: visualização (sem confirm/refuse)

**Gaps vs visão (não começado):**
- Customer accounts (Appointment é guest, sem `customerId`)
- Status workflow (pendente→confirmado→expirado)
- Barbeiro confirma/recusa
- Reviews/rating, promoções, home centralizada
- Login social
- Pagamento, carteira, signup self-service do dono

---

## Decisões das divergências

### DIV 1 — Plataforma: **Expo + Next.js (manter híbrido), NÃO migrar pra PWA**

Já temos 2 apps Expo + Next funcionando, EAS Build OK, push nativo
testado. Migrar pra PWA = jogar fora trabalho e perder push confiável
no iOS. O web público `/b/[slug]` já serve de "PWA" pra cliente que usa
1x (basta adicionar `manifest.json`). Mantém-se:
- **Expo**: mobile-customer + mobile-business (push, retenção)
- **Next.js**: web admin + landing + booking público (= PWA de fato)

### DIV 2 — Slots: **manter janelas + step (modelo atual)**

`slots.service.compute()` já gera `09:00, 09:40, 10:20...` a partir de
`BarberSchedule` (janelas) + `service.durationMin` (step). Isso É o
resultado dos "slots fixos" da visão, sem a rigidez de uma tabela fixa
(que quebraria a cada mudança de duração). Refinamento futuro opcional:
`slotIntervalMin` por schedule pra casos irregulares.

### DIV 3 — Fee: **cliente paga taxa por método, Pix em destaque**

Padrão do mercado BR. Protege margem. Pix com taxa ~zero em destaque
empurra pro método mais barato. Transparência no checkout (mostra antes).
Supersede ADR-005 (que dizia "barbearia absorve").

### DIV 4 — Carteira: **NÃO é MVP. Pós-PMF, e via split do PSP, não float próprio**

Guardar saldo de terceiros = risco regulatório BACEN (instituição de
pagamento) + obrigação fiscal. Caminho correto:
- **Split do PSP** (Mercado Pago / Asaas / Iugu): PSP recebe e divide
  automático (comissão → plataforma, resto → barbearia). Plataforma
  **nunca guarda float** → vira marketplace simples, sem risco BACEN.
- Saque do barbeiro = responsabilidade do PSP.
- Carteira de crédito do cliente (depósito) = Fase 3+ só com escala que
  justifique compliance.

---

## Princípio de arquitetura de pagamento (decisão do usuário)

> "Pagamento é o último mas é o que gerencia tudo. Mock agora, mas já
> deixa o cenário preparado pra implementação real depois."

Implicação técnica desde o S14:
- Modelar entidade `Payment` + campos financeiros no `Appointment`
  desde já (mesmo sem cobrar)
- Interface `PaymentProvider` com `MockPaymentProvider` agora;
  `MercadoPagoProvider`/`AsaasProvider` depois = troca de implementação,
  não de schema
- Status do appointment já contempla estados de pagamento
- Estrutura webhook-ready + idempotente desde o mock

---

## Roadmap (estado atual → produto vendável)

Restrição do usuário: **pagamento/carteira pro FINAL; fluxo
ponta-a-ponta + segurança primeiro** (segurança já está pronta).
Duração: dias-ideais / calendário (part-time ≈ 2.5x).

| Sprint | Objetivo | Dias | Calendário |
|--------|----------|------|-----------|
| S14 | Customer accounts + status workflow + pagamento MOCK (payment-ready) | 6-8 | ~3 sem |
| S15 | Barbeiro confirma/recusa + expiração automática | 5-7 | ~2.5 sem |
| S16 | App business completo + histórico real do cliente | 6-8 | ~3 sem |
| S17 | Reviews/rating + contador de cortes | 4-5 | ~2 sem |
| S18 | Home centralizada + descoberta multi-barbearia | 5-7 | ~2.5 sem |
| S19 | Promoções | 4-5 | ~2 sem |
| S20 | Login social (Google + Apple) | 3-4 | ~1.5 sem |
| S21 | PAGAMENTO REAL (split PSP) — troca o mock | 8-10 | ~4 sem |
| S22 | Signup self-service do dono + subscription | 6-8 | ~3 sem |
| S23+ | Carteira (se PMF justificar) | grande | — |

---

## Quanto falta

| Marco | Estimativa (part-time) |
|-------|------------------------|
| Piloto (1 barbearia real, pagamento mock/Pix-manual) | ~6-8 semanas |
| Produto vendável (multi-barbearia, monetizado) | ~5-7 meses |
| Produto completo (com carteira) | +2-3 meses |

---

## Riscos rankeados

1. 🔴 **Carteira/saque regulatório** → usar split PSP, nunca float próprio
2. 🟠 **Refactor guest→customer accounts** → fazer cedo (S14), manter compat guest no booking público
3. 🟠 **Pagamento real (webhooks/refund/chargeback)** → mock primeiro, máquina de estados madura antes do PSP
4. 🟡 **Race condition na máquina de estados** → state machine explícita + lock otimista + job idempotente
5. 🟡 **Scope creep (47 telas, dev solo)** → piloto primeiro (S14-16), resto depois
6. 🟢 **iOS push** → já mitigado (Expo nativo)

---

## Trade-offs aceitos

- Manter híbrido Expo+Next custa ~igual a migrar PWA, mas preserva push
  e trabalho feito.
- Pagamento mock atrasa receita real mas destrava o fluxo ponta-a-ponta
  pra validar com piloto sem risco de PSP.
- Não construir carteira agora = menos float/fidelização, mas evita
  monstro regulatório.
