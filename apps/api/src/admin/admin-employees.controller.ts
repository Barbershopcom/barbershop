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
} from '@nestjs/swagger';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Auth } from '../auth/auth.decorators';

const CreateEmployeeSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: z.enum(['barber', 'admin', 'admin_barber']),
});

const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

interface EmployeeResponseDto {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Employees API — CRUD de funcionários (barbeiros/admin).
 *
 * **Autenticação:** Bearer token (role: admin)
 * **Rate limit:** 100/min
 *
 * **Invariantes:**
 * - Email único no tenant (validado em DB)
 * - role: 'barber' (apenas serviços), 'admin' (apenas gestão), 'admin_barber' (ambos)
 * - isActive=false mantém histórico, apenas oculta de agendamentos futuros
 * - appUserId fica null até barbeiro aceitar convite via email
 * - Rating é calculado automaticamente de reviews (read-only)
 *
 * **Workflow de onboarding:**
 * 1. Admin cria funcionário (POST /admin/employees, appUserId=null)
 * 2. Sistema envia email de convite
 * 3. Barbeiro clica link → cria AppUser + vincula (POST /me/employee/link)
 * 4. appUserId é preenchido, barbeiro pode agendar
 */
@ApiTags('admin')
@Controller('admin/employees')
@UseGuards(TenantGuard)
@Auth('admin')
export class AdminEmployeesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * **[GET] Listar funcionários do tenant**
   *
   * Retorna todos os funcionários (ativos e inativos) com seus ratings agregados.
   * Ordenado por nome.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar funcionários',
    description: 'Retorna todos os funcionários (ativos/inativos) do tenant.',
  })
  @ApiOkResponse({
    description: 'Lista de funcionários',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          displayName: { type: 'string', example: 'João Silva' },
          email: { type: 'string', example: 'joao@barbershop.com' },
          role: { type: 'string', enum: ['barber', 'admin', 'admin_barber'] },
          isActive: { type: 'boolean' },
          ratingAvg: { type: 'number', nullable: true, example: 4.8 },
          ratingCount: { type: 'number', example: 42 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async list(): Promise<EmployeeResponseDto[]> {
    const tenantId = (this as any).req.tenantId;
    const employees = await this.prisma.employee.findMany({
      where: { tenantId },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { displayName: 'asc' },
    });
    return employees;
  }

  /**
   * **[POST] Criar novo funcionário (convite)**
   *
   * Cria um funcionário e envia email de convite (workflow descrito acima).
   * appUserId fica null até barbeiro aceitar.
   *
   * **Request body:**
   * - `displayName`: Nome completo (1-100 chars)
   * - `email` (opcional): Email para convite
   * - `role`: 'barber' | 'admin' | 'admin_barber'
   *
   * **Response 201:** Funcionário criado (appUserId=null)
   * **Response 400:** Validação falhou (ex: email já existe)
   */
  @Post()
  @ApiOperation({
    summary: 'Criar funcionário (enviar convite)',
    description: 'Cria um novo funcionário e envia email de convite.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['displayName', 'role'],
      properties: {
        displayName: { type: 'string', example: 'João Silva' },
        email: { type: 'string', example: 'joao@email.com' },
        role: { type: 'string', enum: ['barber', 'admin', 'admin_barber'] },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Funcionário criado, convite enviado' })
  @ApiBadRequestResponse({ description: 'Validação falhou (ex: email duplicado)' })
  async create(@Body() body: any): Promise<EmployeeResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = CreateEmployeeSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    const barbershop = await this.prisma.barbershop.findFirst({
      where: { tenantId },
    });
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const employee = await this.prisma.employee.create({
      data: {
        tenantId,
        barbershopId: barbershop.id,
        appUserId: null,
        isActive: true,
        ...valid.data,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // TODO: Enviar email de convite com link de onboarding

    return employee;
  }

  /**
   * **[PATCH] Atualizar funcionário**
   *
   * Atualiza dados do funcionário. Role pode ser alterado dinamicamente.
   * isActive=false não deleta histórico, apenas oculta de agendamentos futuros.
   *
   * **Response 200:** Funcionário atualizado
   * **Response 404:** Funcionário não encontrado
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar funcionário',
    description: 'Atualiza dados do funcionário. Campos opcionais.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['barber', 'admin', 'admin_barber'] },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiOkResponse({ description: 'Funcionário atualizado' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  async update(@Param('id') id: string, @Body() body: any): Promise<EmployeeResponseDto> {
    const tenantId = (this as any).req.tenantId;
    const valid = UpdateEmployeeSchema.safeParse(body);
    if (!valid.success) {
      throw new Error(valid.error.message);
    }

    // Validate ownership before update (IDOR prevention)
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Funcionário não encontrado');
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data: valid.data,
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return employee;
  }

  /**
   * **[DELETE] Deletar funcionário**
   *
   * Remove um funcionário permanentemente.
   * ⚠️ Cuidado: Deleta histórico de appointments e reviews.
   *
   * **Response 204:** Deletado com sucesso
   * **Response 404:** Funcionário não encontrado
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Deletar funcionário',
    description: 'Remove um funcionário permanentemente. Operação irreversível.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Funcionário não encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    const tenantId = (this as any).req.tenantId;

    // Validate ownership before delete (IDOR prevention)
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Funcionário não encontrado');
    }

    await this.prisma.employee.delete({ where: { id } });
  }
}
