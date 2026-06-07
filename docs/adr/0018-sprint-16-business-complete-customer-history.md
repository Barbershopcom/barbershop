# ADR-018: Sprint 16 — App business completo + histórico do cliente

- **Data:** 2026-06-07
- **Status:** Aprovado
- **Supersedes:** nada (continua ADR-015 roadmap, segue ADR-017)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

ADR-017 (S15) fechou pending→confirmed/cancelled/expired. Falta a ponta
final do ciclo de vida do appointment: o barbeiro marcar o corte como
**concluído** (ou **falta**). Sem isso:
- o ciclo nunca termina (confirmed fica pra sempre)
- S17 (reviews) não tem gancho — avaliação dispara após `completed`
- o histórico do cliente não tem estados finais reais

S16 completa o app business (conclusão + folgas self-service) e enriquece
o histórico do cliente (timeline de status).

---

## Decisões

### 1. Transições finais: confirmed → completed | no_show

Estende a state machine (ADR-017 §3):

| De | Para | Ator | Efeito |
|---|---|---|---|
| `confirmed` | `completed` | barbeiro dono | (S17: dispara pedido de avaliação) |
| `confirmed` | `no_show` | barbeiro dono | libera histórico, sem refund (cliente faltou) |

Sem refund em nenhum dos dois: `completed` o serviço foi prestado;
`no_show` o cliente faltou (perde o valor — política padrão do mercado).
Ambos saem do conjunto que ocupa slot (já refletido na EXCLUDE/queries
desde ADR-016).

`completed` só é válido a partir de `confirmed` (não dá pra concluir o
que o barbeiro não confirmou). UPDATE condicional atômico, igual S15.

### 2. Endpoints barbeiro

- `PATCH /me/appointments/:id/complete` → completed
- `PATCH /me/appointments/:id/no-show` → no_show

Mesmo `assertOwnership` do S15 (barberId == me ou admin). 409 se a
transição de origem não bater (race / status errado).

### 3. Sem notificação nessas transições (por ora)

`completed`/`no_show` não disparam push/email nesta sprint. `completed`
vai ganhar o gancho de **avaliação** no S17 (é lá que faz sentido). Manter
o notifier enxuto evita spam ("seu corte foi concluído" é ruído).

### 4. UI business — conclusão na agenda + detalhe por status

A aba **Início** já lista os cortes de hoje. Adiciona, em cada card de
hoje cujo status é `confirmed` e cujo horário já passou (ou é hoje), as
ações **Concluir** / **Faltou**. Sem tela de detalhe dedicada nesta
sprint — ação inline no card (mesma UX dos pendentes do S15), mais rápido
pro barbeiro no balcão.

### 5. Histórico do cliente com timeline (mobile-customer)

`meus-agendamentos` já lista com os 7 status (S14 Fase 5). S16 adiciona:
- **Tabs Próximos / Histórico** — próximos = ativos (awaiting_payment,
  pending, confirmed); histórico = terminais (completed, cancelled,
  expired, no_show)
- Ordenação: próximos por data crescente; histórico decrescente
  (mais recente primeiro)

Sem timeline visual elaborada (evento-a-evento) nesta sprint — o status
badge + data já comunica. Timeline rica fica pra refinamento futuro se
houver demanda. YAGNI.

### 6. Folgas self-service do barbeiro

Hoje só admin cria TimeOff (admin-time-off.controller, web). O barbeiro
precisa marcar a própria folga no app. Novos endpoints `me/time-off`:
- `GET /me/time-off` — folgas futuras do barbeiro logado
- `POST /me/time-off` — cria folga própria (auto-cancela overlapping +
  estorna, reusa a lógica do admin via AppointmentStatusService? Não —
  ver §7)
- `DELETE /me/time-off/:id` — remove folga própria

Escopo do barbeiro: só as **próprias** folgas (barberId == me). RLS +
check explícito.

### 7. TimeOff overlapping no self-service: cancela com refund

Quando o barbeiro marca folga sobre appointments ativos, eles são
cancelados. Diferente do admin-time-off original (que cancelava direto),
aqui passa pela state machine pra **estornar** (consistência com ADR-017):
cada appointment ativo no range → `cancelled` (cancelledBy=barber) +
refund + notifica cliente. Reusa o caminho de `reject` adaptado.

Pra manter simples nesta sprint: o POST retorna a contagem de cancelados
(como o admin já faz), cliente é notificado via o notifier existente.

---

## Schema

Sem migration nova. `completed`/`no_show` já são valores válidos do
CHECK (criado no S14). TimeOff já tem tabela (`barber_time_off`).

---

## Roadmap em fases

| Fase | Entrega |
|---|---|
| 1 | State machine complete/no_show + 2 endpoints barbeiro |
| 2 | UI business: ações Concluir/Faltou nos cards de hoje (Início) |
| 3 | Histórico cliente: tabs Próximos/Histórico (mobile-customer) |
| 4 | Folgas self-service: me/time-off (GET/POST/DELETE) + UI business |

Commit por fase. Sem push automático.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Barbeiro conclui antes da hora / por engano | Permitir só a partir de `confirmed`; sem desfazer (terminal). Aceitável — barbeiro controla. |
| Folga cancela appointment confirmado sem aviso claro | POST retorna count + notifica cliente (refund). UI mostra preview da contagem antes (como admin já faz). |
| no_show sem refund gera disputa | Política explícita (cliente faltou perde). Documentado; revisitar com regra de tolerância se houver atrito. |
