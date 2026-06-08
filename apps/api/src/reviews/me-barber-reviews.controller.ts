import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RatingStats, ReviewItem } from '@barbearia/schemas';

import { CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

/**
 * Avaliações na visão do BARBEIRO (sobre si). Resolve o employee pelo
 * appUserId (bypassRLS) e filtra reviews por barberId — barberId é UUID
 * global, então o filtro explícito já isola.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me/barber/reviews')
export class MeBarberReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveBarberId(user: AuthenticatedUser): Promise<string> {
    const employee = await this.prisma.employee.findFirst({
      where: { appUserId: user.id },
      select: { id: true },
    });
    if (!employee) throw new ForbiddenException('Usuário não vinculado a um funcionário.');
    return employee.id;
  }

  @Get()
  @ApiOkResponse({ description: 'Avaliações recebidas pelo barbeiro + resumo do rating.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ stats: RatingStats; items: ReviewItem[] }> {
    const barberId = await this.resolveBarberId(user);
    const employee = await this.prisma.employee.findUnique({
      where: { id: barberId },
      select: { ratingAvg: true, ratingCount: true },
    });
    const items = await this.reviews.listForBarber(barberId);
    return {
      stats: { avg: employee?.ratingAvg ?? null, count: employee?.ratingCount ?? 0 },
      items,
    };
  }
}
