# ADR-019: Sprint 17 — Avaliações + rating + contador de cortes

- **Data:** 2026-06-07
- **Status:** Aprovado
- **Supersedes:** nada (continua ADR-015 roadmap, segue ADR-018)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

ADR-018 (S16) fechou o ciclo de vida do appointment com `completed`/
`no_show`. O `complete()` da state machine já deixou o gancho documentado:
"S17 dispara pedido de avaliação". Agora o cliente avalia o corte e o
barbeiro/barbearia acumulam reputação — base para a descoberta
multi-barbearia (S18) e promoções de fidelidade (S19).

Dois recursos neste sprint:
1. **Avaliações (reviews)**: cliente nota 1–5 + comentário após um
   `completed`. Agrega rating médio por barbeiro e por barbearia.
2. **Contador de cortes**: total de cortes concluídos do cliente
   (fidelidade/gamificação; insumo das promoções do S19).

---

## Decisões

### 1. Review = 1 por appointment `completed`

| Regra | Decisão |
|---|---|
| Quem avalia | o cliente dono do appointment (por `customerId` OU `customerEmail`) |
| Quando | só com `status = completed` |
| Cardinalidade | 1 review por appointment (`UNIQUE appointment_id`) |
| Conteúdo | `rating` inteiro 1–5 (obrigatório) + `comment` opcional (máx 1000) |
| Edição | o dono pode atualizar a própria review (PATCH); sem janela de tempo no MVP |
| Exclusão | não há (manter histórico; moderação fica pro futuro) |

Avaliação só de corte concluído evita review de quem nunca foi atendido —
o appointment `completed` é a prova de serviço prestado.

### 2. Agregados denormalizados (rating médio)

Calcular `AVG`/`COUNT` a cada leitura não escala pra descoberta (S18
ordena barbearias por nota). Denormalizamos:

- `Employee.ratingAvg` (Float?) + `ratingCount` (Int, default 0)
- `Barbershop.ratingAvg` (Float?) + `ratingCount` (Int, default 0)

**Fonte de verdade = tabela `reviews`.** Os campos são cache. Toda
escrita (create/update de review) **recomputa** `AVG`/`COUNT` da fonte
para o barbeiro e a barbearia afetados — recompute (não incremento) elimina
drift e é trivialmente correto mesmo com edição de nota.

### 3. Contador de cortes

- `Customer.completedCutsCount` (Int, default 0), incrementado no
  `complete()` da state machine quando o appointment tem `customerId`.
- **Fonte de verdade real** = appointments `completed` do cliente; o campo
  é cache de exibição. Contagem por barbearia (para promoções do S19)
  será derivada da tabela `appointments` quando necessário — não
  denormalizamos por-barbearia agora (YAGNI).

### 4. RLS e caminhos de acesso

`reviews` é **tenant-scoped** com policy padrão (igual appointments/
payments): `tenant_id = current_setting('app.tenant_id')`.

| Caminho | Acesso | Filtro |
|---|---|---|
| Cliente cria/edita/lê as suas | bypassRLS (`PrismaService`) | explícito por `customerId`/`customerEmail` (igual `/me/customer-appointments`) |
| Barbeiro lê reviews sobre si | `@Tx()` RLS | `barberId = employee.id` |
| Público (booking page) lê da barbearia | bypassRLS | explícito por `tenantId`/`barbershopId` |

Cliente não é membro de tenant, então segue o padrão bypassRLS+filtro já
estabelecido para `Customer`/`CustomerDevice`. Barbeiro é membro → RLS real.

### 5. Exposição pública do rating

`ratingAvg`/`ratingCount` do barbeiro e da barbearia entram nos payloads
públicos agora (insumo do ranking do S18). A página de booking (web +
mobile-customer) mostra as estrelas; lista pública de reviews recentes da
barbearia via endpoint público dedicado.

---

## Fases

1. **Schema + migration + schemas**: model `Review`, agregados em
   `Employee`/`Barbershop`, `Customer.completedCutsCount`, migration
   idempotente + RLS policy; pacote `@barbearia/schemas` (`review.ts`).
2. **API**: `complete()` incrementa cuts; helper de recompute de agregados;
   endpoints cliente (`POST/GET/PATCH /me/reviews`), barbeiro
   (`GET /me/reviews`), público (`GET /public/:slug/reviews` + rating nos
   payloads de tenant/barbeiro).
3. **mobile-customer**: botão "Avaliar" no histórico (appointments
   `completed` sem review), tela/modal de nota+comentário, contador de
   cortes no perfil.
4. **mobile-business + web**: barbeiro vê seu rating + reviews recentes;
   estrelas na página pública de booking.

---

## Consequências

- Reputação acumulada destrava ranking de descoberta (S18) e fidelidade
  (S19) sem refactor.
- Recompute na escrita custa 1 query extra por review — desprezível no
  volume de um piloto; troca por correção garantida.
- Agregados podem divergir só se a tabela `reviews` for editada fora do
  app (não acontece) — um job de reconciliação é trivial se necessário.

---

## Riscos

- 🟡 Review spam/fake → mitigado por exigir `completed` + 1 por appointment;
  moderação fica pro futuro.
- 🟢 Drift de agregado → recompute na escrita elimina.
