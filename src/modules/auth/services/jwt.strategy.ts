import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IJwtConfig } from '@core/config/jwt.config';
import { IJwtPayload } from '@shared/interfaces';

// Infrastructure only: validates token signature/shape and returns the payload.
// Session/user lookups against the database are business logic, added in a later phase.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwt = configService.get<IJwtConfig>('jwt') as IJwtConfig;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.accessSecret,
    });
  }

  validate(payload: IJwtPayload): IJwtPayload {
    return payload;
  }
}
