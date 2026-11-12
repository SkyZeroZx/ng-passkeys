import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AuthenticatedRequest } from '../guards/session.guard.js';

export const CurrentUserId = createParamDecorator(
	(_data: unknown, context: ExecutionContext) =>
		context.switchToHttp().getRequest<AuthenticatedRequest>().userId as string
);
