import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type MyCustomerProfile,
  type UpdateMyCustomerInput,
  updateMyCustomerSchema,
} from '@barbearia/schemas';

import { type AuthenticatedUser, CurrentUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from './customer.service';

/**
 * Perfil do CLIENTE FINAL logado (mobile-customer). 1:1 com Customer
 * (ADR-016 §2). O checkout pré-preenche daqui; nome/telefone são salvos
 * uma vez e reusados nas reservas seguintes.
 *
 * Não tenant-scoped (cliente reserva em N barbearias). `ensureForUser`
 * cria o Customer + faz account-linking retroativo dos bookings guest.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/customer')
export class MeCustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomerService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Perfil do cliente logado (cria sob demanda).' })
  async get(@CurrentUser() user: AuthenticatedUser): Promise<MyCustomerProfile> {
    const { customerId, email } = await this.customers.ensureForUser(user);
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { id: true, displayName: true, phoneE164: true, completedCutsCount: true },
    });
    return {
      id: customer.id,
      displayName: customer.displayName,
      email,
      phoneE164: customer.phoneE164,
      completedCutsCount: customer.completedCutsCount,
    };
  }

  @Patch()
  @ApiOkResponse({ description: 'Atualiza nome/telefone do perfil.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateMyCustomerSchema)) body: UpdateMyCustomerInput,
  ): Promise<MyCustomerProfile> {
    const { customerId, email } = await this.customers.ensureForUser(user);
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.phoneE164 !== undefined && { phoneE164: body.phoneE164 }),
      },
      select: { id: true, displayName: true, phoneE164: true, completedCutsCount: true },
    });
    return {
      id: customer.id,
      displayName: customer.displayName,
      email,
      phoneE164: customer.phoneE164,
      completedCutsCount: customer.completedCutsCount,
    };
  }
}
