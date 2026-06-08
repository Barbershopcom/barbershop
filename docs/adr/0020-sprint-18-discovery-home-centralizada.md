# ADR-020: Sprint 18 — Home centralizada + descoberta multi-barbearia

- **Data:** 2026-06-08
- **Status:** Aprovado
- **Supersedes:** ADR-010 §2 ("sem marketplace, só search por slug")
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Hoje o cliente só chega numa barbearia por **deeplink/slug** (ADR-010 §2:
"sem marketplace nessa sprint"). A visão de produto é uma home centralizada
onde o cliente **descobre** barbearias — busca por nome, vê nota (S17) e
escolhe. Com reviews/rating prontos (ADR-019), dá pra ranquear.

S18 entrega o marketplace público de descoberta (sem geolocalização ainda —
busca textual + ranking por nota).

---

## Decisões

### 1. Opt-in de listagem: `Tenant.listedPublicly`

Nem toda barbearia quer aparecer num diretório. Campo
`listedPublicly Boolean @default(true)` no Tenant:

- **default true**: no piloto queremos que as barbearias apareçam sem
  config extra; o dono pode esconder depois.
- Admin liga/desliga (toggle no perfil — endpoint já existe pra perfil do
  tenant; adiciona o campo lá).

### 2. Endpoint público de descoberta

`GET /public/discover?q=<busca?>` — bypassRLS (tenants são RLS-protegidos a
membros) com filtro explícito `listedPublicly = true`. Retorna cards:

| Campo | Origem |
|---|---|
| slug, name | Tenant |
| ratingAvg, ratingCount | agregado das reviews do tenant (S17) |
| addressLine | Tenant (perfil, ADR-012) |
| priceFromCents | menor `basePriceCents` de serviço ativo do tenant |

- Busca `q`: ILIKE em `name` (e slug). Sem `q` = todos os listados.
- **Ranking**: com avaliação primeiro (`ratingCount > 0`), depois
  `ratingAvg` desc, depois `name` asc. Determinístico.
- Rate limit 60/min/IP + cache HTTP curto (igual outros públicos).
- Paginação simples por `take` (limite 50 no MVP; sem cursor ainda).

### 3. Home centralizada

- **mobile-customer**: a `(public)/index` deixa de ser só "busca por slug"
  e vira **lista de descoberta** (cards com nota) + campo de busca que
  filtra via `/public/discover?q=`. Deeplink por slug continua funcionando.
- **web**: nova rota pública `/descobrir` com a mesma lista (a home
  institucional `/` ganha CTA pra ela). Server component com cache.

### 4. Fora de escopo (deferido)

- Geolocalização / "perto de mim" (precisa lat/lng + permissão) → futuro.
- Filtros por serviço/preço/horário → futuro.
- Paginação infinita com cursor → futuro (take fixo basta no piloto).

---

## Fases

1. **Backend**: `Tenant.listedPublicly` + migration idempotente; DTO/schema
   de discovery; endpoint `GET /public/discover`; toggle no perfil admin.
2. **mobile-customer**: home de descoberta (lista + busca), mantendo
   deeplink por slug.
3. **web**: página `/descobrir` + CTA na home.

---

## Consequências

- Marketplace destrava aquisição orgânica (cliente acha barbearia sem link
  direto) e dá valor ao rating do S17.
- `listedPublicly` default true expõe pilotos automaticamente — aceitável
  no piloto; vira decisão consciente do dono via toggle.
- Sem geo agora = descoberta é textual; suficiente pra validar o fluxo.

---

## Riscos

- 🟡 Listar tenant sem consentimento → mitigado pelo toggle; revisitar
  default pra `false` se a base crescer além do piloto.
- 🟢 Performance do ranking → agregados denormalizados (S17) já evitam
  recomputar AVG por request.
