# ADR-012: Sprint 11 — Tenant Profile + WhatsApp deeplinks

- **Data:** 2026-05-29
- **Status:** Aprovado
- **Supersedes:** nada
- **Autor:** jarilson.rk@gmail.com (dev solo)

---

## Contexto

Sprint 10 colocou web pública em produção. Cliente abre `/b/<slug>`,
vê catálogo de serviços, mas a página fica genérica — sem endereço,
sem telefone, sem Instagram, sem WhatsApp. Email vintage também fica
sem essa informação no footer.

Brasileiro fecha venda no WhatsApp, não em formulário. Cliente quer
saber: onde fica? como chama? tem Instagram pra ver trabalho? Sem isso,
a landing converte menos.

Sprint 11 adiciona esses campos ao Tenant + UI pra editar + consumo
em landing, email e mobile customer.

---

## Decisões

### 1. **3 campos novos** no Tenant — opcionais, sem migration destrutiva

```prisma
phoneE164         String?  // ex: +5511999999999
addressLine       String?  // ex: "Rua das Tesouras, 123 — Centro"
instagramHandle   String?  // sem @ — ex: "barbearia_jaja"
```

Todos opcionais — barbearia sobe gradualmente. Tenants existentes
continuam funcionando.

**Não entra nessa sprint:**
- `logoUrl` — exige file upload + Supabase Storage. Sprint 13+.
- `foundedYear` — pra exibir "Est. <ano>". User omitiu na decisão do
  email vintage; mantemos consistente.
- Múltiplas redes sociais (Facebook, TikTok, etc.) — Instagram é o
  canal único do segmento. Outros se ouvir pedido específico.

### 2. **WhatsApp via deeplink** `https://wa.me/<phoneE164>?text=...`

Zero custo, zero API externa. Cliente clica → abre WhatsApp já apontando
pra barbearia com texto prefixed:

> Olá! Vim pelo site, quero agendar.

Funciona em mobile (abre app) e desktop (abre WhatsApp Web). Cobre 95%
do caso de uso. WhatsApp Business API fica pra Sprint 13+ se precisar
automatizar mensagens (reminder via WA, etc.).

### 3. **Telefone**: `tel:` link clicável em mobile

`<a href="tel:+5511999999999">` — abre dialer nativo no iPhone/Android.
No desktop não faz nada visível mas não atrapalha. Mostra o número
formatado em pt-BR (`+55 (11) 99999-9999`).

### 4. **Endereço**: texto simples, sem geocoding

MVP exibe `addressLine` como string. Sem Google Maps embed, sem
geocoding, sem "como chegar". Cliente abre Maps manualmente se quiser.

Future: link `https://maps.google.com/?q=<addressLine>` automático.
Esquecível por enquanto.

### 5. **Instagram**: link pra `https://instagram.com/<handle>`

Handle salvo sem `@`. Link mostra "@handle" pro user. Sem embed de feed
(complexidade + Meta API), só link out.

### 6. **Admin edita em `/admin/perfil`** — tela nova

Não vou empurrar pra dentro do onboarding wizard atual (já tem 4 steps).
Nova rota `/admin/perfil` com form de 3 inputs. Acessível pelo menu
admin.

Onboarding **NÃO** muda — barbearia sobe sem profile e completa depois.
Mantém o wizard rápido (commitment baixo no primeiro login).

### 7. **Validação rica** com helper de normalização

- `phoneE164`: normaliza BR comum (`(11) 99999-9999`) → `+5511999999999`.
  Reusa `toE164` helper já criado no web/mobile.
- `instagramHandle`: trim `@` se vier, valida regex `^[A-Za-z0-9_.]{1,30}$`
- `addressLine`: trim, max 200 chars, nullable

Zod schemas em `@barbearia/schemas/admin-tenant-profile.ts`.

### 8. **Public endpoint** GET `/public/tenants/:slug` retorna os 3 campos

Já existe esse endpoint (Sprint 8 / ADR-009). Adiciona os 3 fields no
DTO retornado. Cache HTTP atual (30s) mantém.

### 9. **Email footer** com fallback

Templates atuais têm footer simples "© 2026 X — Vintage Grooming
Specialists". Vou adicionar block opcional acima com endereço/Instagram/
WhatsApp **se** o tenant tiver esses dados. Sem dados → footer atual.

Renderiza:
- 📍 endereço (se addressLine)
- @instagram (se instagramHandle)
- 💬 WhatsApp (se phoneE164)

### 10. **Mobile customer** consome via mesma API pública

Landing `/b/[slug]/index.tsx` no Expo já chama `GET /public/tenants/:slug`.
Adiciono uma seção abaixo do header com os 3 elementos clicáveis
(tel: nativo, instagram://, wa.me).

---

## Trade-offs aceitos

- **Sem upload de logo** — fica visual genérico. Logo entra quando
  Supabase Storage estiver setup (Sprint 13+).
- **Sem horário de funcionamento na landing pública** — admin já cadastra
  em `/admin/hours` mas não expõe pro cliente. Adicionar é trivial mas
  não veio nesse sprint pra manter escopo limpo.
- **Sem múltiplas redes sociais** — Instagram é suficiente pro segmento
  barbeiro brasileiro. Twitter/Facebook/TikTok ficam pra demanda real.
- **WhatsApp deeplink, não API** — sem automação de envio. MVP cobre o
  caso "cliente clica e fala com a barbearia". Automação (reminder via
  WA) é Sprint 13+.

---

## Roadmap em fases

| Fase | Entrega                                                                          |
|------|----------------------------------------------------------------------------------|
| 1    | ADR + migration `tenant_profile_fields` + schema Prisma + Zod schemas            |
| 2    | API: GET /public/tenants/:slug + PATCH /admin/tenants/me                         |
| 3    | Web admin: rota `/admin/perfil` com form (nome, phone, address, instagram)        |
| 4    | Landing `/b/[slug]` (web) com endereço, tel:, Instagram, WhatsApp button         |
| 5    | Email vintage footer dinâmico com 3 fields opcionais                              |
| 6    | Landing mobile-customer com mesmas seções clicáveis                              |

Cada fase fecha com commit.
