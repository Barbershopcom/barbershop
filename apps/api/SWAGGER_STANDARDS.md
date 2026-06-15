# 📚 Swagger/OpenAPI Documentation Standards

## Nível: Senior

Padrões de documentação de API aplicados a todos os controllers da Barbearia SaaS.

---

## 1️⃣ Estrutura de Documentação

Cada endpoint deve ter:

### Controller Header (JSDoc)
```typescript
/**
 * Admin Services API — CRUD de serviços por tenant.
 *
 * **Autenticação:** Bearer token JWT (role: admin)
 * **Rate limit:** 100/min
 * **Cache:** Serviços são cacheados por 30s no cliente público
 *
 * **Invariantes:**
 * - Serviço deve ter pelo menos 1 barbeiro capaz
 * - Preço em centavos (5000 = R$ 50,00)
 * - Duração em minutos (mínimo 15, máximo 480)
 * - isActive=false oculta de descoberta, mas preserva histórico
 */
```

### Endpoint Header
```typescript
/**
 * **[GET] Listar serviços do tenant**
 *
 * Retorna todos os serviços (ativos e inativos) do tenant autenticado,
 * ordenados por preço e nome. Útil para gerenciamento administrativo.
 *
 * **Response 200:** Array de serviços com metadados (created_at, updated_at)
 * **Response 401:** Token inválido/expirado
 * **Response 403:** Usuário sem role 'admin'
 */
```

---

## 2️⃣ Decoradores Swagger (NestJS)

### Mínimo Obrigatório

```typescript
@Get()
@ApiOperation({
  summary: 'Listar serviços do tenant',        // 1-2 palavras, imperativo
  description: 'Retorna todos os serviços...'  // Completa o summary
})
@ApiOkResponse({
  description: 'Lista de serviços',
  schema: { /* DTO schema */ }
})
async list(): Promise<ServiceDto[]> { }
```

### Completo (Recomendado)

```typescript
@Post()
@ApiOperation({
  summary: 'Criar novo serviço',
  description: 'Cria um novo serviço para o tenant autenticado. Começa inativo.',
})
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer token JWT',
  required: true,
})
@ApiBody({
  description: 'Dados do serviço',
  schema: {
    type: 'object',
    required: ['name', 'durationMin', 'basePriceCents'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      durationMin: { type: 'number', minimum: 15, maximum: 480 },
      basePriceCents: { type: 'number', exclusiveMinimum: 0 },
    },
  },
})
@ApiCreatedResponse({
  description: 'Serviço criado com sucesso',
  schema: { /* Response DTO */ },
})
@ApiBadRequestResponse({ description: 'Campo inválido ou faltando' })
@ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
@ApiForbiddenResponse({ description: 'Usuário sem permissão (role: admin)' })
async create(@Body() body: CreateServiceDto): Promise<ServiceDto> { }
```

---

## 3️⃣ Checklist de Documentação

Para cada endpoint, verificar:

- [ ] **Summary**: imperativo, 1-5 palavras (ex: "Criar novo serviço")
- [ ] **Description**: complementa o summary com detalhes
- [ ] **Path parameters**: @ApiParam com description e example
- [ ] **Query parameters**: @ApiQuery com description e required
- [ ] **Request body**: @ApiBody com schema completo (required fields, types, ranges)
- [ ] **Response 2xx**: @ApiOkResponse/@ApiCreatedResponse com schema
- [ ] **Response 4xx**: @ApiBadRequestResponse, @ApiNotFoundResponse, @ApiUnauthorizedResponse, @ApiForbiddenResponse
- [ ] **Rate limit**: documentado no header do controller
- [ ] **Cache**: documentado se aplicável
- [ ] **Autenticação**: Bearer? API Key? Roles?
- [ ] **Exemplos**: values realistic no schema (ex: "joao@email.com", não "string")

---

## 4️⃣ Padrões de Invariantes

Sempre documentar "As regras do jogo" do modelo:

```
**Invariantes:**
- Preço em centavos (5000 = R$ 50,00)
- Duração em minutos (mínimo 15, máximo 480)
- Role: 'barber' | 'admin' | 'admin_barber'
- isActive=false oculta de descoberta, preserva histórico
- discountType: 'percent' (basis points: 1000=10%) | 'fixed' (centavos)
- Email único por tenant (validado em DB)
- AppUser vinculado após aceitar convite (workflow 3 passos)
```

---

## 5️⃣ Workflow & Lifecycle

Quando há operações multi-passo, documentar no JSDoc do controller:

```typescript
/**
 * **Workflow de onboarding:**
 * 1. Admin cria funcionário (POST /admin/employees, appUserId=null)
 * 2. Sistema envia email de convite
 * 3. Barbeiro clica link → cria AppUser + vincula (POST /me/employee/link)
 * 4. appUserId é preenchido, barbeiro pode agendar
 */
```

---

## 6️⃣ Operações Destrutivas

Sempre avisar quando irreversível:

```typescript
/**
 * **[DELETE] Deletar serviço**
 *
 * Remove um serviço permanentemente.
 * ⚠️ Cuidado: Deleta todas as referências (capabilities, appointments históricos).
 *
 * **Response 204:** Deletado com sucesso
 * **Response 404:** Serviço não encontrado
 */
```

---

## 7️⃣ Exemplos Realistas

Schema de exemplo **BOM** ❌→✅:

```typescript
// ❌ Ruim
properties: {
  email: { type: 'string', example: 'string' },
  price: { type: 'number', example: 'number' },
}

// ✅ Bom
properties: {
  email: { type: 'string', example: 'joao@barbershop.com' },
  basePriceCents: { type: 'number', example: 5000 },
  discountValue: { type: 'number', example: 3000 },
}
```

---

## 8️⃣ Ranges & Constraints

Sempre documentar limits numericamente:

```typescript
// ❌ Ruim
durationMin: { type: 'number', description: 'Duração em minutos' }

// ✅ Bom
durationMin: {
  type: 'number',
  description: 'Duração em minutos',
  minimum: 15,
  maximum: 480,
}
```

---

## 9️⃣ Validação (Zod)

Sempre usar Zod schema com mensagens claras:

```typescript
const CreateServiceSchema = z.object({
  name: z.string()
    .min(1, 'Nome obrigatório')
    .max(100, 'Máximo 100 caracteres'),
  durationMin: z.number()
    .int('Deve ser número inteiro')
    .positive('Duração deve ser positiva'),
  basePriceCents: z.number()
    .int('Preço em centavos (inteiro)')
    .positive('Preço deve ser positivo'),
});
```

---

## 🔟 Status Codes

Mapa padrão:

| Code | Quando | Exemplo |
|------|--------|---------|
| **200** | GET ok | Listar serviços |
| **201** | POST ok | Criar serviço |
| **204** | DELETE ok | Deletar serviço |
| **400** | Validação | Campo obrigatório faltando, formato inválido |
| **401** | Auth | Token inválido/expirado |
| **403** | Autorização | Usuário não tem role admin |
| **404** | Não encontrado | Serviço com ID não existe |
| **409** | Conflito | Email já existe |
| **422** | Unprocessable | Lógica de negócio (ex: serviço sem barbeiro) |
| **429** | Rate limit | Muitas requisições |
| **500** | Server error | Bug no código, não documenta |

---

## Estrutura do Schema Response

```typescript
schema: {
  type: 'object',
  required: ['id', 'name', 'createdAt'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
    name: {
      type: 'string',
      maxLength: 100,
      example: 'Corte clássico',
    },
    basePriceCents: {
      type: 'integer',
      example: 5000,
      description: 'Preço em centavos (5000 = R$ 50,00)',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
  },
}
```

---

## Autenticação & Guards

Sempre documentar o guard + decorator:

```typescript
@Controller('admin/services')
@UseGuards(TenantGuard)      // ← Tenant scoping automático
@Auth('admin')               // ← Role validation
export class AdminServicesController { }
```

No Swagger:
```typescript
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer token JWT (role: admin)',
  required: true,
})
```

---

## Cache & Rate Limit

Documentar ao lado da descrição:

```typescript
/**
 * Admin Employees API — CRUD de funcionários (barbeiros/admin).
 *
 * **Autenticação:** Bearer token (role: admin)
 * **Rate limit:** 100/min
 * **Cache:** Não (dado administrativo sensível)
 */
```

---

## References entre Recursos

Quando um recurso depende de outro, documentar:

```typescript
/**
 * Serviço deve ter pelo menos 1 barbeiro capaz.
 * Veja POST /admin/employees para criar barbeiros.
 */
```

---

## Deprecation

Marcar endpoints obsoletos:

```typescript
@Deprecated('Use POST /admin/services em vez disso')
@Get('legacy/services')
async legacyList() { }
```

---

## Todos & Notes

Deixar anotações úteis para próximas sprints:

```typescript
// TODO: Implementar cupom desconto application em checkout (ADR-021)
// TODO: Adicionar filtros de data em listPromotions (ADR-023)
// TODO: Enviar email de convite após criar employee
```

---

## Exemplo Completo

Ver `admin-services.controller.ts` como referência de implementação.

---

**Last updated:** 2026-06-15
**Versão:** 1.0 (Senior Level)
