import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from './auth.decorators';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role?: string;
  aud?: string;
  iss?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private static readonly logger = new Logger(JwtStrategy.name);

  constructor(config: ConfigService) {
    const jwksUri = config.get<string>('SUPABASE_JWKS_URL');
    const audience = config.get<string>('SUPABASE_JWT_AUDIENCE');
    const issuer = config.get<string>('SUPABASE_JWT_ISSUER');

    const configured = Boolean(jwksUri);
    if (!configured) {
      JwtStrategy.logger.warn(
        'SUPABASE_JWKS_URL not set — protected routes will reject all requests until configured.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience,
      issuer,
      algorithms: ['ES256', 'RS256'],
      secretOrKeyProvider: configured
        ? passportJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 10,
            jwksUri: jwksUri as string,
          })
        : (_req, _token, done) =>
            done(new UnauthorizedException('Supabase Auth not configured on this server')),
    });
  }

  validate(payload: SupabaseJwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token: missing sub');
    }
    return {
      id: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      raw: payload,
    };
  }
}
