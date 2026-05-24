import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { type AuthenticatedUser, CurrentUser } from '../auth/auth.decorators';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({
    description: 'Retorna o usuário autenticado (claims do JWT do Supabase).',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      role: user.role ?? null,
    };
  }
}
