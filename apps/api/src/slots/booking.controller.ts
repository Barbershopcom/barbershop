import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { type BookAppointmentInput, bookAppointmentSchema } from '@barbearia/schemas';

import { Public } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BookingService } from './booking.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Booking público: cliente reserva slot. Sem auth (ADR-005 §1).
 *
 * Rate limit: 10/min/IP (writes são mais caras e mais abusable que reads).
 * Idempotency-Key obrigatório (ADR-005 §2).
 *
 * Possíveis responses:
 *   201 — appointment criado
 *   200 — appointment já existia (idempotent replay)
 *   400 — validação falhou ou Idempotency-Key faltando/inválido
 *   404 — tenant slug ou serviço não encontrado
 *   409 — slot foi pego por outro entre revalidação e INSERT (race)
 *   422 — slot indisponível, barbeiro inválido, ou idempotency mismatch
 *   429 — rate limit
 */
@ApiTags('public-booking')
@Public()
@Controller('public/tenants/:slug/appointments')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // Override via res.status() abaixo se replay (200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiParam({ name: 'slug', description: 'Slug do tenant.' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'UUID v4 do cliente. Retry com mesma key + body retorna response cacheado.',
    required: true,
  })
  @ApiOkResponse({ description: 'Appointment criado (201) ou idempotent replay (200).' })
  async book(
    @Param('slug') slug: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(bookAppointmentSchema)) body: BookAppointmentInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Header Idempotency-Key obrigatório. Gere um UUID antes do POST.',
      );
    }
    if (!UUID_REGEX.test(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key deve ser UUID válido.');
    }

    const result = await this.booking.book({ slug, idempotencyKey, body });
    res.status(result.status);
    return result.body;
  }
}
