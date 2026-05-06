import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const secret = req.headers['x-internal-secret'];
    if (secret !== this.config.get<string>('internalApiSecret')) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
