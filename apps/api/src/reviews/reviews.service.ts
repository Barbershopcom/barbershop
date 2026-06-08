import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReviewInput,
  MyReviewItem,
  RatingStats,
  ReviewItem,
  UpdateReviewInput,
} from '@barbearia/schemas';

import { PrismaService } from '../prisma/prisma.service';

/** Identidade do cliente resolvida pelo controller (conta + email). */
interface CustomerIdentity {
  customerId: string;
  email: string;
}

/**
 * Lógica de avaliações (ADR-019). Usa o PrismaService base (bypassRLS,
 * igual `/me/customer-appointments`) porque o cliente não é membro de
 * tenant — o isolamento vem de filtros explícitos por customerId/email.
 * Leituras do barbeiro/público também filtram explicitamente.
 *
 * Toda escrita recomputa os agregados de rating do barbeiro e da barbearia
 * a partir da tabela `reviews` (fonte de verdade), eliminando drift.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria a review de um appointment completed do cliente. */
  async createForCustomer(
    identity: CustomerIdentity,
    input: CreateReviewInput,
  ): Promise<MyReviewItem> {
    const appt = await this.loadOwnedCompletedAppointment(identity, input.appointmentId);

    const existing = await this.prisma.review.findUnique({
      where: { appointmentId: appt.id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Esse atendimento já foi avaliado.');
    }

    await this.prisma.review.create({
      data: {
        tenantId: appt.tenantId,
        appointmentId: appt.id,
        customerId: identity.customerId,
        barberId: appt.barberId,
        barbershopId: appt.barbershopId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
    await this.recompute(appt.barberId, appt.barbershopId);

    return this.getMyReview(appt.id);
  }

  /** Edita a própria review (rating e/ou comment). */
  async updateForCustomer(
    identity: CustomerIdentity,
    appointmentId: string,
    input: UpdateReviewInput,
  ): Promise<MyReviewItem> {
    const appt = await this.loadOwnedCompletedAppointment(identity, appointmentId);
    const review = await this.prisma.review.findUnique({
      where: { appointmentId },
      select: { id: true, customerId: true },
    });
    if (!review) throw new NotFoundException('Avaliação não encontrada.');
    if (review.customerId !== identity.customerId) {
      throw new ForbiddenException('Essa avaliação não é sua.');
    }

    await this.prisma.review.update({
      where: { appointmentId },
      data: {
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.comment !== undefined ? { comment: input.comment ?? null } : {}),
      },
    });
    await this.recompute(appt.barberId, appt.barbershopId);

    return this.getMyReview(appointmentId);
  }

  /** Lista as reviews do cliente. */
  async listForCustomer(identity: CustomerIdentity): Promise<MyReviewItem[]> {
    const rows = await this.prisma.review.findMany({
      where: { customerId: identity.customerId },
      orderBy: { createdAt: 'desc' },
      select: myReviewSelect,
    });
    const tenants = await this.tenantNameMap(rows.map((r) => r.tenantId));
    return rows.map((r) => toMyReview(r, tenants.get(r.tenantId) ?? ''));
  }

  /** Reviews sobre um barbeiro (visão do próprio barbeiro). */
  async listForBarber(barberId: string): Promise<ReviewItem[]> {
    const rows = await this.prisma.review.findMany({
      where: { barberId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: reviewItemSelect,
    });
    return rows.map(toReviewItem);
  }

  /** Reviews públicas recentes de uma barbearia (por tenant). */
  async listForTenant(tenantId: string, limit = 20): Promise<ReviewItem[]> {
    const rows = await this.prisma.review.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: reviewItemSelect,
    });
    return rows.map(toReviewItem);
  }

  /** Rating agregado do tenant (soma das barbearias). */
  async tenantRating(tenantId: string): Promise<RatingStats> {
    const agg = await this.prisma.review.aggregate({
      where: { tenantId },
      _avg: { rating: true },
      _count: true,
    });
    return { avg: round1(agg._avg.rating), count: agg._count };
  }

  /**
   * Recomputa ratingAvg/ratingCount do barbeiro e da barbearia a partir
   * da tabela reviews. Chamado após toda escrita (ADR-019 §2).
   */
  private async recompute(barberId: string, barbershopId: string): Promise<void> {
    const [barberAgg, shopAgg] = await Promise.all([
      this.prisma.review.aggregate({
        where: { barberId },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.review.aggregate({
        where: { barbershopId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    await Promise.all([
      this.prisma.employee.update({
        where: { id: barberId },
        data: { ratingAvg: round1(barberAgg._avg.rating), ratingCount: barberAgg._count },
      }),
      this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { ratingAvg: round1(shopAgg._avg.rating), ratingCount: shopAgg._count },
      }),
    ]);
  }

  /** Carrega o appointment garantindo que é do cliente e está completed. */
  private async loadOwnedCompletedAppointment(
    identity: CustomerIdentity,
    appointmentId: string,
  ): Promise<{
    id: string;
    tenantId: string;
    barberId: string;
    barbershopId: string;
    status: string;
    customerId: string | null;
    customerEmail: string | null;
  }> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        tenantId: true,
        barberId: true,
        barbershopId: true,
        status: true,
        customerId: true,
        customerEmail: true,
      },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');
    const isOwner =
      appt.customerId === identity.customerId || appt.customerEmail === identity.email;
    if (!isOwner) throw new ForbiddenException('Esse agendamento não é seu.');
    if (appt.status !== 'completed') {
      throw new BadRequestException('Só é possível avaliar um corte concluído.');
    }
    return appt;
  }

  private async getMyReview(appointmentId: string): Promise<MyReviewItem> {
    const row = await this.prisma.review.findUnique({
      where: { appointmentId },
      select: myReviewSelect,
    });
    if (!row) throw new NotFoundException('Avaliação não encontrada.');
    const tenants = await this.tenantNameMap([row.tenantId]);
    return toMyReview(row, tenants.get(row.tenantId) ?? '');
  }

  private async tenantNameMap(tenantIds: string[]): Promise<Map<string, string>> {
    const ids = Array.from(new Set(tenantIds));
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(tenants.map((t) => [t.id, t.name]));
  }
}

/** Média 1..5 arredondada a 1 casa; null se sem reviews. */
function round1(avg: number | null): number | null {
  if (avg === null) return null;
  return Math.round(avg * 10) / 10;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

const myReviewSelect = {
  id: true,
  appointmentId: true,
  rating: true,
  comment: true,
  createdAt: true,
  tenantId: true,
  barber: { select: { displayName: true } },
  appointment: {
    select: { startAt: true, service: { select: { name: true } } },
  },
} as const;

type MyReviewRow = {
  id: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  tenantId: string;
  barber: { displayName: string };
  appointment: { startAt: Date; service: { name: string } };
};

function toMyReview(r: MyReviewRow, tenantName: string): MyReviewItem {
  return {
    id: r.id,
    appointmentId: r.appointmentId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    barberName: r.barber.displayName,
    serviceName: r.appointment.service.name,
    tenantName,
    appointmentAt: r.appointment.startAt.toISOString(),
  };
}

const reviewItemSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  appointment: {
    select: { customerName: true, service: { select: { name: true } } },
  },
} as const;

type ReviewItemRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  appointment: { customerName: string; service: { name: string } };
};

function toReviewItem(r: ReviewItemRow): ReviewItem {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    customerFirstName: firstName(r.appointment.customerName),
    serviceName: r.appointment.service.name,
  };
}
