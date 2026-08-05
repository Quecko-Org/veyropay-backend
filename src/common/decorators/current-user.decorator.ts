import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { IJwtPayload } from '@shared/interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IJwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: IJwtPayload }>();
    return request.user;
  },
);
