import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwtSecret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      'super_access_secret_change_me';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    hotelId: string;
  }) {
    const user = await this.authService.validateUserById(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    return user;
  }
}