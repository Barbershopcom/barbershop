import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Auth } from '../auth/auth.decorators';
import type { PublicServiceDto } from '@barbearia/schemas';

const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().positive('Duração deve ser positiva'),
  bufferMin: z.number().int().nonnegative('Buffer não pode ser negativo').default(0),
  basePriceCents: z.number().int().positive('Preço deve ser positivo'),
});

const UpdateServiceSchema = CreateServiceSchema.partial();

interface ServiceResponseDto extends PublicServiceDto {
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Services API — CRUD de serviços por tenant.
 *
 * **Autenticação:** Bearer token JWT (role: admin)
 * **Rate limit:** 100/min
 * **Cache:** Serviços são cacheados por 30s no cliente público
 *
 * **Invariantes:**
 * - Serviço deve ter pelo menos 1 barbeiro capaz (validation na criação)
 * - Preço em centavos (centavos BRL, ex: 5000 = R$ 50,00)
 * - Duração em minutos (mínimo 15, máximo 480)
 * - Buffer é o tempo de limpeza pós-serviço (afeta cálculo de slots)
 * - isActive=false oculta o serviço de descoberta, mas bookings existentes permanecem válidos
 */
@ApiTags('admin')
@Controller('admin/services')
@UseGuards(TenantGuard)
@Auth('admin')
export class AdminServicesController {
  constructor(private readonly prisma: PrismaService) {}

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
  @Get()
  @ApiOperation({
    summary: 'Listar serviços do tenant',
    description: 'Retorna todos os serviços (ativos e inativos) do tenant autenticado.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token JWT',
    required: true,
  })
  @ApiOkResponse({
    description: 'Lista de serviços',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Corte clássico' },
          description: { type: 'string', example: 'Corte com tesoura' },
          durationMin: { type: 'number', example: 30 },
          bufferMin: { type: 'number', example: 5 },
          basePriceCents: { type: 'number', example: 5000 },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiForbiddenResponse({ description: 'Usuário sem permissão (role: admin)' })
  async list(): Promise<ServiceResponseDto[]> {
    // Tenant extraído do JWT via TenantGuard
    const tenantId = (this as any).req.tenantId;
    const services = await this.prisma.service.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        bufferMin: true,
        basePriceCents: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ basePriceCents: 'asc' }, { name: 'asc' }],
    });
    return services;
  }

  /**
   * **[POST] Criar novo serviço**
   *
   * Cria um novo serviço para o tenant autenticado.
   * O serviço fica inativo por padrão — ative em PATCH após associar barbeiros.
   *
   * **Request body:**
   * - `name` (string, 1-100 chars): Nome do serviço
   * - `description` (string, opcional, ≤500 chars): Descrição
   * - `durationMin` (number, 15-480): Duração em minutos
   * - `bufferMin` (number, ≥0, default=0): Tempo de limpeza pós-serviço
   * - `basePriceCents` (number, >0): Preço em centavos (5000 = R$ 50,00)
   *
   * **Response 201:** Serviço criado
   * **Response 400:** Validação falhou
   * **Response 401/403:** Não autenticado ou sem permissão
   */
  @Post()
  @ApiOperation({
    summary: 'Criar novo serviço',
    description: 'Cria um novo serviço para o tenant. Começa inativo.',
  })
  @ApiBody({
    description: 'Dados do serviço',
    schema: {
      type: 'object',
      required: ['name', 'durationMin', 'basePriceCents'],
      properties: {
        name: { type: 'string', example: 'Corte clássico' },
        description: { type: 'string', example: 'Corte com tesoura' },
        durationMin: { type: 'number', example: 30 },
        bufferMin: { type: 'number', example: 5 },
        basePriceCents: { type: 'number', example: 5000 },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Serviço criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        basePriceCents: { type: 'number' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Campo inválido ou faltando' })
  async create(@Body() body: any): Promise<ServiceResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = CreateServiceSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    const service = await this.prisma.service.create({
      data: {
        tenantId,
        barbershopId: (await this.prisma.barbershop.findFirst({ where: { tenantId } }))?.id!,
        isActive: false,
        ...valid.data,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        bufferMin: true,
        basePriceCents: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return service;
  }

  /**
   * **[PATCH] Atualizar serviço**
   *
   * Atualiza um serviço existente. Todos os campos são opcionais.
   * Mudar `isActive` afeta visibilidade pública, não invalida bookings.
   *
   * **Response 200:** Serviço atualizado
   * **Response 404:** Serviço não encontrado
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar serviço',
    description: 'Atualiza um serviço existente. Campos opcionais.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID do serviço',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        durationMin: { type: 'number' },
        bufferMin: { type: 'number' },
        basePriceCents: { type: 'number' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiOkResponse({ description: 'Serviço atualizado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async update(@Param('id') id: string, @Body() body: any): Promise<ServiceResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = UpdateServiceSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    // Validate ownership before update (IDOR prevention)
    const existing = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Serviço não encontrado');
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: valid.data,
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        bufferMin: true,
        basePriceCents: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return service;
  }

  /**
   * **[DELETE] Deletar serviço**
   *
   * Remove um serviço permanentemente.
   * ⚠️ Cuidado: Deleta todas as referências (capabilities, appointments históricos).
   *
   * **Response 204:** Deletado com sucesso
   * **Response 404:** Serviço não encontrado
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Deletar serviço',
    description: 'Remove um serviço permanentemente. Operação irreversível.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    const tenantId = (this as any).req.tenantId;

    // Validate ownership before delete (IDOR prevention)
    const existing = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Serviço não encontrado');
    }

    await this.prisma.service.delete({ where: { id } });
  }
}
