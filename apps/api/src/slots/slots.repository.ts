import { Injectable, NotFoundException } from '@nestjs/common';
import { slotOccupyingStatuses } from '@barbearia/schemas';
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
export interface PublicTenantInfo {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  status: string;
  phoneE164: string | null;
  addressLine: string | null;
  instagramHandle: string | null;
}

export interface PublicTarget {
  tenant: PublicTenantInfo;
  /** Unidade resolvida — null quando o slug do tenant tem várias unidades (modo seletor). */
  barbershop: { id: string; slug: string; name: string } | null;
  /** Unidades ativas pro seletor — vazio quando uma unidade foi resolvida. */
  units: Array<{ slug: string; name: string; addressLine1: string; city: string }>;
}

const tenantSelect = {
  id: true,
  slug: true,
  name: true,
  timezone: true,
  status: true,
  phoneE164: true,
  addressLine: true,
  instagramHandle: true,
} as const;

@Injectable()
export class SlotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolução pública dual (multi-unidade, spec 2026-07-07):
   * 1. slug bate numa BARBERSHOP ativa → tenant dono + essa unidade;
   * 2. senão, slug de TENANT → 1 unidade ativa: resolve direto;
   *    várias: modo seletor (barbershop null + units);
   * 3. nada → 404. Links antigos (slug do tenant) seguem funcionando.
   */
  async resolvePublicTarget(slug: string): Promise<PublicTarget> {
    const shop = await this.prisma.barbershop.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, isActive: true, tenantId: true },
    });
    if (shop) {
      if (!shop.isActive) throw new NotFoundException(`Tenant '${slug}' não encontrado.`);
      const owner = await this.prisma.tenant.findUnique({
        where: { id: shop.tenantId },
        select: tenantSelect,
      });
      if (!owner) throw new NotFoundException(`Tenant '${slug}' não encontrado.`);
      return {
        tenant: owner,
        barbershop: { id: shop.id, slug: shop.slug, name: shop.name },
        units: [],
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: tenantSelect,
    });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' não encontrado.`);

    const shops = await this.prisma.barbershop.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        location: { select: { addressLine1: true, city: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (shops.length === 1) {
      const only = shops[0]!;
      return {
        tenant,
        barbershop: { id: only.id, slug: only.slug, name: only.name },
        units: [],
      };
    }
    return {
      tenant,
      barbershop: null,
      units: shops.map((s) => ({
        slug: s.slug,
        name: s.name,
        addressLine1: s.location.addressLine1,
        city: s.location.city,
      })),
    };
  }

  /**
   * Resolve tenant pelo slug (tenant OU unidade). Retorna 404 se não existir.
   * Wrapper de compat sobre resolvePublicTarget — consumidores que só precisam
   * do tenant (cupons, gating) seguem usando este.
   */
  async resolveTenant(slug: string): Promise<PublicTenantInfo> {
    return (await this.resolvePublicTarget(slug)).tenant;
  }

  /**
   * Resolve service ativo pelo id E garante que pertence ao tenant (e à
   * unidade, quando informada — evita agendar serviço de outra unidade pelo
   * slug errado). Retorna 404 se inexistente, inativo, ou fora do escopo.
   */
  async resolveActiveService(
    tenantId: string,
    serviceId: string,
    barbershopId?: string,
  ): Promise<{
    id: string;
    barbershopId: string;
    durationMin: number;
    bufferMin: number;
    name: string;
    basePriceCents: number;
  }> {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId,
        isActive: true,
        ...(barbershopId ? { barbershopId } : {}),
      },
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
   * Status da assinatura do tenant (RLS bypassado por design — filtra por tenantId).
   * Retorna null se não houver linha de subscription (tenant legado — não bloqueia).
   */
  async getSubscriptionStatus(tenantId: string): Promise<string | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: { status: true },
    });
    return sub?.status ?? null;
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
            // Ocupam o slot: awaiting_payment | pending | confirmed (ADR-016 §3).
            // Espelha a EXCLUDE constraint anti-overbooking.
            status: { in: [...slotOccupyingStatuses] },
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
