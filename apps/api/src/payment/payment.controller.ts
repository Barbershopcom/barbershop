import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  computeAllMethodBreakdowns,
  type ConfirmPaymentInput,
  confirmPaymentSchema,
  type PaymentDto,
  type PaymentMethod,
  type PriceBreakdown,
} from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentError, PaymentService } from './payment.service';

/**
 * Pagamento de um appointment (ADR-016 §5). Público — cliente guest
 * também paga. Mock aprova na hora; transiciona awaiting_payment→pending.
 *
 * Responses:
 *   GET  /options → breakdown de preço por método (pra UI montar o seletor)
 *   POST /pay     → cobra + transiciona; 200 com PaymentDto
 *     404 appointment não encontrado · 422 status inválido
 */
@ApiTags('public-payment')
@Public()
@Controller('public/appointments/:id/payment')
export class PaymentController {
  constructor(
    private readonly payment: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('options')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiParam({ name: 'id', description: 'UUID do appointment.' })
  @ApiOkResponse({ description: 'Breakdown de preço por método de pagamento.' })
  async options(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ priceCents: number; methods: Record<PaymentMethod, PriceBreakdown> }> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: { priceCents: true },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');
    return {
      priceCents: appt.priceCents,
      methods: computeAllMethodBreakdowns(appt.priceCents),
    };
  }

  @Get()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiParam({ name: 'id', description: 'UUID do appointment.' })
  @ApiOkResponse({ description: 'Status do pagamento (pra polling do Pix).' })
  async status(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string | null; appointmentStatus: string; paidAt: string | null }> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: { status: true, payment: { select: { status: true, paidAt: true } } },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');
    return {
      status: appt.payment?.status ?? null,
      appointmentStatus: appt.status,
      paidAt: appt.payment?.paidAt ? appt.payment.paidAt.toISOString() : null,
    };
  }

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiParam({ name: 'id', description: 'UUID do appointment.' })
  @ApiOkResponse({ description: 'Pagamento processado; appointment vira pending.' })
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmPaymentSchema)) body: ConfirmPaymentInput,
  ): Promise<{ payment: PaymentDto; pixQrCode?: string; pixQrCodeBase64?: string }> {
    try {
      return await this.payment.pay({
        appointmentId: id,
        method: body.method,
        description: 'Agendamento — Barbearia',
      });
    } catch (err) {
      if (err instanceof PaymentError) {
        if (err.code === 'not_found') throw new NotFoundException(err.message);
        if (err.code === 'invalid_status') {
          throw new UnprocessableEntityException({ message: err.message, code: err.code });
        }
      }
      throw err;
    }
  }
}
