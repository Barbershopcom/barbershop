import { Injectable, NotFoundException } from '@nestjs/common';
import { fromZonedTime } from 'date-fns-tz';

import { PrismaService } from '../prisma/prisma.service';
import type { BarberInput, HourRange } from './slots.service';

/**
 * Repository do módulo público de slots.
 *
 * Decisão (ADR-004 §5): este repository **bypassa RLS de propósito**.
 * Endpoint público não tem JWT → TenantInterceptor não abre transação
 * com `SET LOCAL ROLE app_user` → PrismaService usa o role default
 * (owner/admin do Postgres) que tem BYPASSRLS implícito.
 *
 * Compensação: todo query aqui FILTRA explicitamente por `tenantId =
 * resolvedTenant.id`. Não confie no Postgres pra isolar — é
 * responsabilidade desta camada.
 */
@Injectable()
export class SlotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve tenant pelo slug. Retorna 404 se não existir.
   * Não exige auth — slug é público.
   */
  async resolveTenant(
    slug: string,
  ): Promise<{ id: string; slug: string; name: string; timezone: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, timezone: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' não encontrado.`);
    return tenant;
  }

  /**
   * Resolve service ativo pelo id E garante que pertence ao tenant.
   * Retorna 404 se inexistente, inativo, ou de outro tenant.
   */
  async resolveActiveService(
    tenantId: string,
    serviceId: string,
  ): Promise<{
    id: string;
    barbershopId: string;
    durationMin: number;
    bufferMin: number;
    name: string;
    basePriceCents: number;
  }> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, isActive: true },
      select: {
        id: true,
        barbershopId: true,
        durationMin: true,
        bufferMin: true,
        name: true,
        basePriceCents: true,
      },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado ou inativo.');
    return service;
  }

  /**
   * Carrega todos os dados necessários pra calcular slots em uma janela.
   *
   * @param fromDateUtc instante UTC do início do dia `from` no tz do tenant
   * @param toDateUtcExclusive instante UTC do fim (exclusivo) do dia `to`
   */
  async loadSlotInputs(args: {
    tenantId: string;
    barbershopId: string;
    serviceId: string;
    barberId?: string;
    fromDateUtc: Date;
    toDateUtcExclusive: Date;
  }): Promise<{ shopHours: HourRange[]; barbers: BarberInput[] }> {
    const { tenantId, barbershopId, serviceId, barberId, fromDateUtc, toDateUtcExclusive } = args;

    // 1. Horário da barbearia (todos os weekdays — algoritmo filtra por dia)
    const shopHoursRows = await this.prisma.barbershopHours.findMany({
      where: { tenantId, barbershopId },
      select: { weekday: true, opensAt: true, closesAt: true },
    });

    // 2. Barbeiros ativos com capability pro serviço.
    //    Carrega também TimeOff que overlap com a janela (Sprint 7).
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        barbershopId,
        isActive: true,
        capabilities: { some: { serviceId } },
        ...(barberId ? { id: barberId } : {}),
      },
      select: {
        id: true,
        displayName: true,
        schedules: {
          select: { weekday: true, opensAt: true, closesAt: true },
        },
        appointments: {
          where: {
            status: 'booked',
            startAt: { lt: toDateUtcExclusive },
            endAt: { gt: fromDateUtc },
          },
          select: { startAt: true, endAt: true },
        },
        timeOff: {
          where: {
            startAt: { lt: toDateUtcExclusive },
            endAt: { gt: fromDateUtc },
          },
          select: { startAt: true, endAt: true },
        },
      },
    });

    const barbers: BarberInput[] = employees.map((e) => ({
      id: e.id,
      displayName: e.displayName,
      schedules: e.schedules,
      appointments: e.appointments,
      timeOff: e.timeOff,
    }));

    return { shopHours: shopHoursRows, barbers };
  }
}

/**
 * Helper compartilhado: converte YYYY-MM-DD no timezone do tenant pra
 * instante UTC de meia-noite (início do dia).
 */
export function dateStartUtc(dateStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr} 00:00:00`, timezone);
}

/**
 * Início do dia SEGUINTE em UTC — útil pra usar como `endExclusive`.
 * Soma 1 dia em UTC (sem DST) antes de converter, simples e seguro.
 */
export function dateEndExclusiveUtc(dateStr: string, timezone: string): Date {
  const [y, m, d] = [
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)),
    Number(dateStr.slice(8, 10)),
  ];
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = nextDay.toISOString().slice(0, 10);
  return fromZonedTime(`${nextStr} 00:00:00`, timezone);
}
