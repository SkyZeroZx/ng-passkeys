import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { ApiErrorBody } from '@ng-passkeys/shared';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const body = this.toBody(exception);

		if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
			this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);
		}

		ctx.getResponse<Response>().status(body.statusCode).json(body);
	}

	private toBody(exception: unknown): ApiErrorBody {
		if (exception instanceof HttpException) {
			const statusCode = exception.getStatus();
			const response = exception.getResponse();

			if (typeof response === 'object' && 'code' in response) {
				return response as ApiErrorBody;
			}

			const message =
				typeof response === 'string'
					? response
					: [(response as { message?: string | string[] }).message].flat().join(' ');

			return { statusCode, code: HttpStatus[statusCode], message };
		}

		if (exception instanceof QueryFailedError && /unique|duplicate/i.test(exception.message)) {
			return { statusCode: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'Already exists.' };
		}

		return {
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Internal server error.'
		};
	}
}
