import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/auth.decorators';

/**
 * Endpoint pra testar que Sentry está recebendo eventos (ADR-014).
 * Lança erro proposital e Sentry filter global captura.
 *
 * Ativar via DEBUG_SENTRY=true env. Em prod desativado pra evitar
 * gerar erro fake no dashboard quando alguém descobrir a URL.
 */
@ApiTags('debug')
@Public()
@Controller('debug-sentry')
export class DebugSentryController {
  @Get()
  trigger(): never {
    if (process.env.DEBUG_SENTRY !== 'true') {
      throw new Error('DEBUG_SENTRY=true required to use this endpoint.');
    }
    throw new Error(
      'Sentry test error — se você está vendo isso no dashboard, init está OK.',
    );
  }
}
