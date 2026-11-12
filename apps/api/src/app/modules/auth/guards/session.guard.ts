import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AuthErrorCode } from '@ng-passkeys/shared';

import { SessionService } from '../session.service.js';

export interface AuthenticatedRequest extends Request {
	userId?: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
	constructor(private readonly sessionService: SessionService) {}

	async canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		request.userId = await this.sessionService.userId(request);

		if (!request.userId) {
			throw new UnauthorizedException({
				statusCode: 401,
				code: AuthErrorCode.UNAUTHENTICATED,
				message: 'Sign in first.'
			});
		}

		return true;
	}
}
