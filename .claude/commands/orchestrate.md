---
description: Orquestra o Esquadrão Tesoura numa feature — descoberta, plano por membro, execução em ordem de dependência, com portões de aprovação.
argument-hint: <descrição da feature> (ex: CRUD de serviços no web)
---

# Orquestração — Esquadrão Tesoura

Você é o **maestro** da equipe. Vai coordenar os subagents
(product-manager, backend-engineer, frontend-engineer, ux-designer,
devops-engineer, qa-engineer) para entregar a feature abaixo de ponta a
ponta, SEM codar no escuro e SEM pular aprovação humana.

## Feature solicitada
$ARGUMENTS

## Regras de ouro
- Nunca assuma o que existe: cada fase começa lendo o código real.
- Pare nos PORTÕES e espere o "ok" do usuário antes de avançar.
- Cada agente relata o bloco STATUS dele (feito / pendente / bloqueado por
  / entregável). Nada de progresso inventado: se só planejou, diga isso.
- Respeite os ADRs em `docs/adr/`. Se a feature conflita com um, levante
  o conflito em vez de ignorar.

---

## FASE 1 — Descoberta (product-manager)
Invoque o **product-manager** para inspecionar o repositório e produzir:
- Tabela "JÁ EXISTE" vs "FALTA" (backend, frontend, schemas compartilhados,
  multi-tenancy, padrões a reusar).
- Perguntas em aberto (em vez de suposições).
- Critérios de aceite verificáveis.
- Divisão de tasks POR MEMBRO: cada task com "o que fazer" (arquivo/pasta
  provável), "depende de" e "entregável".
- Sequência de execução (o que desbloqueia o quê; o que roda em paralelo).

### 🚦 PORTÃO 1
Mostre o plano e PARE. Pergunte ao usuário: "Aprova o plano ou quer
ajustar?" Só siga após aprovação explícita.

---

## FASE 2 — Design, se a feature tem UI (ux-designer)
Se a feature envolve telas, invoque o **ux-designer** para entregar tokens
e spec dos componentes (estados: default, loading, erro, vazio, sucesso)
ANTES do front-end implementar. Se for feature sem UI, pule esta fase.

### 🚦 PORTÃO 2 (só se houve design)
Mostre a spec e PARE para aprovação.

---

## FASE 3 — Execução em ordem de dependência
Execute as tasks respeitando as dependências do plano da Fase 1. Padrão
típico (ajuste conforme o plano):

1. **backend-engineer** executa as tasks dele. No fim, reporta o STATUS
   COM o contrato dos endpoints (método, rota, body, resposta) para o
   front consumir sem adivinhar.
2. **frontend-engineer** executa as tasks dele, consumindo o contrato que
   o back entregou e a spec do ux-designer. Reporta STATUS.
3. **devops-engineer** entra se a feature exige mudança de CI/deploy/env.

Antes de cada agente codar, ele confirma no código o que já existe (não
assume). Invoque um agente de cada vez e mostre o STATUS de cada um.

### 🚦 PORTÃO 3
Após backend + frontend, mostre o que foi implementado e PARE para o
usuário revisar antes do QA.

---

## FASE 4 — Verificação (qa-engineer)
Invoque o **qa-engineer** para validar contra os critérios de aceite da
Fase 1. Ele escreve e RODA os testes (foco em isolamento entre tenants,
edge cases, concorrência), reporta o resultado REAL (X/Y passando) e dá o
veredito: pode mergear ou não.

---

## FECHAMENTO
Resuma:
- O que foi entregue (por membro).
- Testes: resultado real.
- Pendências e bloqueios remanescentes.
- Próximo passo sugerido.

Lembre o usuário de revisar o diff e commitar — você não faz push sem
aprovação explícita.
