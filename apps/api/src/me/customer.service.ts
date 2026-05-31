import { Injectable, Logger } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gerencia a conta de cliente final (ADR-016 §2).
 *
 * Booking público é guest-first (ADR-005): nasce sem customerId, só com
 * customerEmail/Phone. Quando o cliente loga e abre o app, `ensureForUser`
 * cria/atualiza o Customer e faz **account-linking retroativo** — adota os
 * appointments guest feitos com o mesmo email, preenchendo customerId.
 *
 * Não tenant-scoped (cliente reserva em N barbearias). Bypassa RLS via
 * PrismaService global + filtros explícitos, igual CustomerDevice.
 */
@Injectable()
export class CustomerService {
  private static readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garante que existe um Customer pro user logado e vincula bookings
   * guest com o mesmo email. Idempotente. Retorna o customerId.
   */
  async ensureForUser(user: AuthenticatedUser): Promise<{
    customerId: string;
    email: string | null;
  }> {
    const email = user.email ?? null;
    const rawName = user.raw.name;
    const displayName =
      (typeof rawName === 'string' && rawName) ||
      email?.split('@')[0] ||
      'Cliente';

    const customer = await this.prisma.customer.upsert({
      where: { appUserId: user.id },
      create: {
        appUserId: user.id,
        displayName,
        phoneE164: typeof user.phone === 'string' ? user.phone : null,
      },
      update: {}, // não sobrescreve nome editado pelo cliente
      select: { id: true },
    });

    // Account-linking retroativo: appointments guest com o mesmo email
    // que ainda não têm customerId passam a pertencer a esse Customer.
    if (email) {
      const linked = await this.prisma.appointment.updateMany({
        where: { customerEmail: email, customerId: null },
        data: { customerId: customer.id },
      });
      if (linked.count > 0) {
        CustomerService.logger.log(
          `Vinculados ${linked.count} appointments guest ao customer ${customer.id}`,
        );
      }
    }

    return { customerId: customer.id, email };
  }
}
