# ADR-009: Sprint 8 — Web pública de booking (cliente final)

- **Data:** 2026-05-28
- **Status:** Aprovado
- **Supersedes:** nada (extende ADR-004/005)
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

API pública (`/public/tenants/:slug/...`) está pronta desde Sprint 3-5 mas
**sem UI**. O cliente final não tem como reservar — nem app nem link no
WhatsApp. O `mobile-customer` está só com `_layout`/`index`/`login`
(esqueleto), e construir o app completo levaria 8-12 dias contra 4-5 da
versão web.

Sprint 8 entrega a web pública de booking — a barbearia ganha um link
divulgável (`app.com/b/<slug>`) e o cliente reserva sem instalar nada.
Mobile-customer vira Sprint 10+ se aparecer demanda diferenciada
(fidelidade, assinatura), não antes.

---

## Decisões

### 1. **Web pública dentro de `apps/web`** — não app separado

Rota `/b/[slug]` no mesmo Next.js que já hospeda `/admin/*` e `/onboarding`.
Compartilha `tailwind.config`, `design-tokens`, `ApiClient`, layout base.

- Custo zero de infra adicional (mesma Vercel/Railway)
- Subdomínio futuro `app.com` → `b.app.com` ou domínio próprio por
  barbearia (`barbeariadojaja.com.br`) fica pra Sprint 11+

### 2. UX flow: **serviço → calendário → horário → form → sucesso**

```
/b/[slug]                    Landing — nome da barbearia + serviços
/b/[slug]/agendar?s=ID       Step 1: serviço já escolhido, escolhe dia/hora
/b/[slug]/agendar?s=ID&t=ISO Step 2: form do cliente (nome/tel/email)
/b/[slug]/sucesso?id=ID      Confirmação + cancel link
```

**Sem etapa explícita de "escolher barbeiro"**. Cliente escolhe o slot
direto, com o nome do barbeiro embutido (`14:00 — com Jaja`). Filtro
opcional `?b=ID` no topo do calendário pra quem tem preferência.

Trade-off: simplifica em 1 click mas perde a tela "conheça nossa equipe".
Aceitamos — primeira impressão da barbearia é o catálogo de serviço, não
a equipe. Equipe vira tela `/b/[slug]/equipe` futuramente (Sprint 9+).

### 3. **Server components** onde der + RSC fetch direto da API

Páginas `/b/[slug]` e `/b/[slug]/agendar` são server components que fazem
`fetch()` direto da API com `next: { revalidate: 60 }`. Catálogo da
barbearia + serviços é cache-friendly.

Calendário de slots e form de booking são client components (interação
dinâmica). Lista de slots usa `fetch` client-side pra não cachear
horários que mudam minuto-a-minuto.

### 4. APIs novas necessárias

Hoje só existe `GET /public/tenants/:slug/slots` e `POST .../appointments`.
Faltam:

- `GET /public/tenants/:slug` → `{ id, slug, name, timezone, addressLine, phone }`
- `GET /public/tenants/:slug/services` → lista de serviços ativos com
  `{ id, name, durationMin, priceCents, description }`

Sem necessidade de `/public/tenants/:slug/employees` — slots já vêm
agrupados com `barberId`/`barberName`. Cliente escolhe slot, não barbeiro.

Rate limit 60/min/IP (mesmo do `/slots`). Cache HTTP 30s (catálogo muda
raro). Sem auth.

### 5. **Idempotency-Key client-side via `crypto.randomUUID()`**

Browser gera UUID no momento que o cliente clica "Confirmar" e mantém em
sessionStorage até o redirect pra `/sucesso`. Retry (F5, conexão ruim) usa
a mesma key → API retorna o mesmo booking (200 OK em vez de 201). Mesmo
contrato do mobile-business em Sprint 4.

Se cliente fechar tab e voltar, key vai pra outra (sessionStorage limpo).
OK — booking já tá criado, ele vê confirmação no email.

### 6. Booking **guest** — sem Supabase login

Cliente reserva como guest informando nome + telefone (obrigatórios) e
email (opcional mas recomendado pra confirmar). Login Supabase opcional
fica pra quando aparecer demanda de histórico/perfil (Sprint 10+).

Implicação: `GET /me/appointments` segue sendo só pro usuário logado
admin/barbeiro. Cliente acompanha booking via email + cancel token.

### 7. Calendar UI: **react-day-picker** (date) + **chips de horário**

FullCalendar é overkill pra customer-side (timegrid pesado, visual de
agenda profissional). Trocamos por:

- `react-day-picker` pra escolher o dia (~10KB, locale pt-BR nativo,
  já alinha com nosso design tokens)
- Lista de horários disponíveis renderizada como chips abaixo
  (`<button>` agrupados por hora)

Stack: `pnpm add react-day-picker date-fns` (date-fns já é dep transitiva).

### 8. SEO: `generateMetadata` + Open Graph por barbearia

Página `/b/[slug]` exporta `generateMetadata` que busca o tenant e cria:

```ts
{
  title: `${tenant.name} — Agende online`,
  description: `Agendamento online para ${tenant.name}.`,
  openGraph: { title, description, images: [logoUrl] },
}
```

Robots `index,follow`. Link sharing no WhatsApp/Instagram pega card OG.
Sitemap automático fica pra Sprint 9+ (precisa listar tenants ativos —
não-trivial e nice-to-have).

### 9. Erros HTTP → componentes Next dedicados

- `404` (slug não existe) → `apps/web/src/app/b/[slug]/not-found.tsx`
- `503` (API down) → `error.tsx` com "Tente novamente em instantes"
- `409` (slot levado durante booking) → toast + reload do calendário
- `422` (slot indisponível, dados inválidos) → mensagem inline no form

Sem retry automático — tela mostra o erro, cliente decide.

### 10. **Mobile-first responsive**

70%+ do tráfego deve vir de WhatsApp → mobile. Layout default = stack
vertical, breakpoint `md:` empilha lado-a-lado pra desktop. Botões
tamanho touch (min 44px), font 16px (evita zoom no iOS).

Sem PWA install prompt nessa sprint (custo > benefício antes de
validar tração).

---

## Trade-offs aceitos

- **Sem barbeiro picker dedicado** — perde "conheça nosso barbeiro"
  como UX, ganha 1 click a menos. Reavalia quando barbearia pedir.
- **Sem pagamento online** — booking é compromisso de palavra. Sinal
  via Pix/cartão entra em Sprint 11+ junto com no-show prevention.
- **Sem cliente logado** — sem histórico, sem perfil, sem fidelidade.
  Email cobre o caso de uso de cancel/reschedule.
- **Sem busca de barbearia** — cliente chega pelo link, não procura
  no marketplace. Marketplace é outra sprint inteira (Sprint 12+).

---

## Roadmap em fases

| Fase | Entrega                                                                      |
|------|------------------------------------------------------------------------------|
| 1    | ADR + APIs públicas novas (`/public/tenants/:slug`, `.../services`)          |
| 2    | Esqueleto rota `/b/[slug]` (landing) + catálogo de serviços                  |
| 3    | Calendário de slots + escolha de horário (`/b/[slug]/agendar?s=ID`)          |
| 4    | Form cliente + POST booking + Idempotency-Key + tela de sucesso              |
| 5    | SEO (generateMetadata + OG) + polish responsivo                              |

Cada fase fecha com commit. Smoke ponta-a-ponta no final.
