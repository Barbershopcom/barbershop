# Guest → Customer Account Linking

## Visão Geral

O sistema de barbearia adota um modelo **guest-first** (ADR-005, ADR-016 §2) onde:
- Clientes podem fazer bookings **sem login** — chamados de "guest bookings"
- Guest bookings são identificados por `customerEmail` (ou `customerPhone`)
- Quando um cliente faz login, seus guest bookings são automaticamente vinculados à sua conta ("account linking retroativo")

## Fluxo

### 1. **Guest Booking** (`POST /public/slots/book`)

```
Cliente abre app mobile (não logado)
  ↓
Preenche: nome, email, telefone, serviço, data/hora
  ↓
Appointment criado com:
  - customerEmail: "joao@email.com"
  - customerId: NULL
  - status: awaiting_payment
```

**Código**: [booking.service.ts](apps/api/src/slots/booking.service.ts)

### 2. **Cliente Faz Login** (Supabase Auth via expo-auth-session)

```
Cliente toca "Entrar com Google/Email"
  ↓
Supabase cria/retorna JWT com { sub, email, phone, ... }
  ↓
TenantInterceptor sincroniza app_users (lazy sync)
  ↓
API pronto para requisições autenticadas
```

**Código**: 
- [auth.module.ts](apps/api/src/auth/auth.module.ts)
- [tenant.interceptor.ts](apps/api/src/tenancy/tenant.interceptor.ts)

### 3. **Account Linking Retroativo** (`GET /me/customer-appointments` ou qualquer endpoint `/me/...`)

```
Cliente faz GET /me/customer-appointments
  ↓
MeCustomerAppointmentsController.list() é chamado
  ↓
Chama this.customers.ensureForUser(user) antes de filtrar
```

**CustomerService.ensureForUser()** faz:

```typescript
// 1. Criar ou retornar Customer existente
const customer = await prisma.customer.upsert({
  where: { appUserId: user.id },
  create: { appUserId: user.id, displayName, phoneE164 },
  update: {},
});

// 2. Vincular appointments guest com o mesmo email
const linked = await prisma.appointment.updateMany({
  where: { customerEmail: user.email, customerId: null },
  data: { customerId: customer.id },
});
// Resultado: todos os guest bookings feitos com "joao@email.com" agora têm customerId
```

**Código**: [customer.service.ts](apps/api/src/me/customer.service.ts:85-97)

### 4. **Filtragem com Fallback para Race Conditions**

```typescript
// Após ensureForUser, a maioria dos bookings tem customerId
// Mas enquanto a requisição rodava, novo guest booking pode ter sido criado
// com customerEmail = user.email (antes de ensureForUser vincular)

const appointments = await prisma.appointment.findMany({
  where: {
    AND: [
      // Filtra por customerId (linkado) OU customerEmail (race condition)
      { OR: [{ customerId }, { customerEmail: user.email }] },
      // Validação pós-query: garante que não há cross-tenant leak
      // (ver security note abaixo)
    ],
  },
});
```

**Código**: [me-customer-appointments.controller.ts](apps/api/src/me/me-customer-appointments.controller.ts:67-75)

## Segurança

### Cross-Tenant Isolation
Guest bookings não passam por RLS (são públicos em `/public/slots/book`). Portanto:

1. **Query-level**: filtro por `customerId` OR `customerEmail`
2. **Validation-level** (pós-query): verificar que `customerId = user.id` OR `customerEmail = user.email`
   - Evita que User A veja bookings de User B que têm o mesmo email (improvável, mas teoricamente possível em race)

**Código**: [me-customer-appointments.controller.ts:150-152](apps/api/src/me/me-customer-appointments.controller.ts)

### Email Uniqueness
A coluna `app_users.email` tem `UNIQUE` constraint. Portanto:
- Dois usuários Supabase diferentes **não podem ter o mesmo email**
- Account linking é seguro: email identifica unicamente o usuário

## Edge Cases

### Race Condition: Novo Guest Booking Durante Login

```
Usuario A faz login e ensureForUser() vincula seus bookings.
Mas enquanto isso, ele fez POST /public/slots/book (mobile offline).

Resultado:
- Novo booking criado com customerEmail (não linkado ainda)
- GET /me/customer-appointments filtra por (customerId OR customerEmail)
- Fallback garante que novo booking seja incluído mesmo não-linkado
```

**Solução**: O fallback `OR [{ customerId }, { customerEmail: user.email }]` cobre isso.

### Múltiplas Requisições Simultâneas em /me/...

```
GET /me/customer-appointments (1º requisição)
  ↓
Chama ensureForUser() → cria Customer + vincula
  ↓
GET /me/customer-appointments (2º requisição, paralela)
  ↓
Chama ensureForUser() → retorna Customer já existente (upsert é idempotente)
  ↓
Ambas funcionam OK
```

**Garantia**: `upsert` + `updateMany` são idempotentes.

## Endpoints Envolvidos

| Endpoint | Autenticação | Função |
|----------|--------------|--------|
| `POST /public/slots/book` | Pública | Criar guest booking |
| `GET /me/customer-appointments` | JWT | Listar e vincular |
| `POST /me/customer-appointments/:id/cancel` | JWT | Cancelar (requer account linking) |
| `POST /me/reviews` | JWT | Avaliar serviço (requer account linking) |

## Próximas Melhorias (Sprint 7+)

1. **Notificação de Linking**: Email/push quando guest booking é linkado
2. **Merge Manual**: UI pra usuario linkar accounts manualmente (email diferente)
3. **Account Hierarchy**: Múltiplos clientes num telefone (ex: família)

## Referências

- ADR-005: Guest-first bookings (ver decisão no projeto)
- ADR-016: Customer model e lazy sync
- [customer.service.ts](apps/api/src/me/customer.service.ts)
- [me-customer-appointments.controller.ts](apps/api/src/me/me-customer-appointments.controller.ts)
