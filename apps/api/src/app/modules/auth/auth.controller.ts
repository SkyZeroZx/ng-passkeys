import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Req,
	Res,
	UseGuards
} from '@nestjs/common';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Request, Response } from 'express';

import type {
	SessionResponse,
	VerifiedAuthenticationResponse,
	VerifiedRegistrationResponse
} from '@ng-passkeys/shared';

import { UserService } from '../user/user.service.js';
import { CurrentUserId } from './decorators/current-user.decorator.js';
import { LoginOptionsDto, RegisterOptionsDto, VerifyDto } from './dto/auth.dto.js';
import { SessionGuard } from './guards/session.guard.js';
import { SessionService } from './session.service.js';
import { WebAuthnService } from './web-authn.service.js';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly webAuthnService: WebAuthnService,
		private readonly sessionService: SessionService
	) {}

	@Post('register/options')
	@HttpCode(HttpStatus.OK)
	async registerOptions(
		@Body() { username, displayName }: RegisterOptionsDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const userId = await this.sessionService.userId(req);
		const { ceremonyId, options } = await this.webAuthnService.generateRegistrationOptions(
			username,
			displayName,
			userId
		);

		this.sessionService.setCeremony(res, ceremonyId);
		return options;
	}

	@Post('register/verify')
	@HttpCode(HttpStatus.OK)
	async registerVerify(
		@Body() { response, nickname }: VerifyDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	): Promise<VerifiedRegistrationResponse> {
		const { user, credential } = await this.webAuthnService.verifyRegistration(
			this.sessionService.readCeremony(req),
			response as unknown as RegistrationResponseJSON,
			nickname
		);

		this.sessionService.clearCeremony(res);
		await this.sessionService.start(res, user.id);

		return {
			verified: true,
			user: UserService.toPublicUser(user),
			credential: WebAuthnService.toPublicCredential(credential)
		};
	}

	@Post('login/options')
	@HttpCode(HttpStatus.OK)
	async loginOptions(
		@Body() { username }: LoginOptionsDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { ceremonyId, options } =
			await this.webAuthnService.generateAuthenticationOptions(username);

		this.sessionService.setCeremony(res, ceremonyId);
		return options;
	}

	@Post('login/verify')
	@HttpCode(HttpStatus.OK)
	async loginVerify(
		@Body() { response }: VerifyDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	): Promise<VerifiedAuthenticationResponse> {
		const credential = await this.webAuthnService.verifyAuthentication(
			this.sessionService.readCeremony(req),
			response as unknown as AuthenticationResponseJSON
		);

		this.sessionService.clearCeremony(res);
		await this.sessionService.start(res, credential.user.id);

		return {
			verified: true,
			user: UserService.toPublicUser(credential.user),
			credentialId: credential.id
		};
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		return this.sessionService.end(req, res);
	}

	@Get('session')
	async session(@Req() req: Request): Promise<SessionResponse | null> {
		const userId = await this.sessionService.userId(req);
		return userId ? this.webAuthnService.session(userId) : null;
	}

	@Delete('credentials/:id')
	@UseGuards(SessionGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	removeCredential(@CurrentUserId() userId: string, @Param('id') id: string) {
		return this.webAuthnService.removeCredential(userId, id);
	}
}
