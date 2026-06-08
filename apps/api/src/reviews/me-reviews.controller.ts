import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type CreateReviewInput,
  createReviewSchema,
  type MyReviewItem,
  type UpdateReviewInput,
  updateReviewSchema,
} from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CustomerService } from '../me/customer.service';
import { ReviewsService } from './reviews.service';

/**
 * Avaliações na visão do CLIENTE FINAL (mobile-customer). Bypassa RLS,
 * igual `/me/customer-appointments` — escopo vem do customerId/email.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/reviews')
export class MeReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly customers: CustomerService,
  ) {}

  private async identity(
    user: AuthenticatedUser,
  ): Promise<{ customerId: string; email: string }> {
    if (!user.email) {
      throw new BadRequestException('Usuário sem email cadastrado.');
    }
    const { customerId } = await this.customers.ensureForUser(user);
    return { customerId, email: user.email };
  }

  @Get()
  @ApiOkResponse({ description: 'Avaliações feitas pelo cliente logado.' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<MyReviewItem[]> {
    return this.reviews.listForCustomer(await this.identity(user));
  }

  @Post()
  @ApiOkResponse({ description: 'Cria avaliação de um corte concluído.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewInput,
  ): Promise<MyReviewItem> {
    return this.reviews.createForCustomer(await this.identity(user), body);
  }

  @Patch(':appointmentId')
  @ApiOkResponse({ description: 'Edita a própria avaliação.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body(new ZodValidationPipe(updateReviewSchema)) body: UpdateReviewInput,
  ): Promise<MyReviewItem> {
    return this.reviews.updateForCustomer(await this.identity(user), appointmentId, body);
  }
}
