import { randomUUID } from 'node:crypto';

import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { DataSource, Repository } from 'typeorm';

import { AuthErrorCode, PublicCredential, SessionResponse } from '@ng-passkeys/shared';

import { webAuthnConfig } from '../../core/config/index.js';
import { UserEntity } from '../user/entities/user.entity.js';
import { UserService } from '../user/user.service.js';
import { authenticatorName, defaultNickname } from './aaguid.js';
import { Ceremony, ChallengeService } from './challenge.service.js';
import { CredentialEntity } from './entities/credential.entity.js';

@Injectable()
export class WebAuthnService {
	constructor(
		@Inject(webAuthnConfig.KEY)
		private readonly config: ConfigType<typeof webAuthnConfig>,
		@InjectRepository(CredentialEntity)
		private readonly credentialRepository: Repository<CredentialEntity>,
		private readonly userService: UserService,
		private readonly challengeService: ChallengeService,
		private readonly dataSource: DataSource
	) {}

	async generateRegistrationOptions(username: string, displayName?: string, userId?: string) {
		const user = userId ? await this.userService.findById(userId) : null;

		if (!user && (await this.userService.findByUsername(username))) {
			throw new ConflictException({
				statusCode: 409,
				code: AuthErrorCode.USERNAME_TAKEN,
				message: 'That username is already registered.'
			});
		}

		const webauthnUserId = user?.webauthnUserId ?? randomUUID();
		const credentials = user ? await this.findCredentials(user.id) : [];

		const options = await generateRegistrationOptions({
			rpName: this.config.rpName,
			rpID: this.config.rpId,
			userID: new TextEncoder().encode(webauthnUserId),
			userName: user?.username ?? username,
			userDisplayName: user?.displayName ?? displayName ?? username,
			attestationType: 'none',
			excludeCredentials: credentials.map(({ id, transports }) => ({ id, transports })),
			authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
		});

		// The account is created on verify, not here, so nobody can squat a username.
		const ceremonyId = await this.challengeService.save({
			type: 'registration',
			challenge: options.challenge,
			userId: user?.id,
			username: user?.username ?? username,
			displayName: user?.displayName ?? displayName ?? username,
			webauthnUserId
		});

		return { ceremonyId, options };
	}

	async verifyRegistration(
		ceremonyId: string,
		response: RegistrationResponseJSON,
		nickname?: string
	) {
		const ceremony = await this.takeCeremony(ceremonyId, 'registration');

		const { verified, registrationInfo } = await this.verify(() =>
			verifyRegistrationResponse({
				response,
				expectedChallenge: ceremony.challenge,
				expectedOrigin: this.config.origins,
				expectedRPID: this.config.rpId,
				requireUserVerification: true
			})
		);

		if (!verified || !registrationInfo) {
			throw this.unauthorized(AuthErrorCode.VERIFICATION_FAILED, 'Registration not verified.');
		}

		const { credential, credentialDeviceType, credentialBackedUp, aaguid } = registrationInfo;
		const transports = credential.transports ?? [];

		return this.dataSource.transaction(async (manager) => {
			const user = ceremony.userId
				? await manager.findOneByOrFail(UserEntity, { id: ceremony.userId })
				: await manager.save(
						manager.create(UserEntity, {
							username: ceremony.username,
							displayName: ceremony.displayName,
							webauthnUserId: ceremony.webauthnUserId
						})
					);

			const saved = await manager.save(
				manager.create(CredentialEntity, {
					id: credential.id,
					user,
					publicKey: Buffer.from(credential.publicKey),
					counter: credential.counter,
					transports,
					deviceType: credentialDeviceType,
					backedUp: credentialBackedUp,
					aaguid,
					nickname: nickname?.trim() || defaultNickname(aaguid, transports)
				})
			);

			return { user, credential: saved };
		});
	}

	async generateAuthenticationOptions(username?: string) {
		// Unknown usernames still get options, so the endpoint does not reveal who has an account.
		const user = username ? await this.userService.findByUsername(username) : null;
		const credentials = user ? await this.findCredentials(user.id) : [];

		const options = await generateAuthenticationOptions({
			rpID: this.config.rpId,
			allowCredentials: credentials.map(({ id, transports }) => ({ id, transports })),
			userVerification: 'required'
		});

		const ceremonyId = await this.challengeService.save({
			type: 'authentication',
			challenge: options.challenge,
			userId: user?.id
		});

		return { ceremonyId, options };
	}

	async verifyAuthentication(ceremonyId: string, response: AuthenticationResponseJSON) {
		const ceremony = await this.takeCeremony(ceremonyId, 'authentication');

		const credential = await this.credentialRepository.findOne({
			where: { id: response.id },
			relations: { user: true }
		});

		if (!credential || (ceremony.userId && ceremony.userId !== credential.user.id)) {
			throw this.unauthorized(AuthErrorCode.CREDENTIAL_NOT_FOUND, 'Unknown passkey.');
		}

		const userHandle = response.response.userHandle;
		if (
			userHandle &&
			Buffer.from(userHandle, 'base64url').toString() !== credential.user.webauthnUserId
		) {
			throw this.unauthorized(AuthErrorCode.VERIFICATION_FAILED, 'User handle mismatch.');
		}

		const { verified, authenticationInfo } = await this.verify(() =>
			verifyAuthenticationResponse({
				response,
				expectedChallenge: ceremony.challenge,
				expectedOrigin: this.config.origins,
				expectedRPID: this.config.rpId,
				credential: {
					id: credential.id,
					publicKey: new Uint8Array(credential.publicKey),
					counter: credential.counter,
					transports: credential.transports
				},
				requireUserVerification: true
			})
		);

		if (!verified) {
			throw this.unauthorized(AuthErrorCode.VERIFICATION_FAILED, 'Signature not verified.');
		}

		await this.credentialRepository.update(credential.id, {
			counter: authenticationInfo.newCounter,
			lastUsedAt: new Date()
		});

		return credential;
	}

	async session(userId: string): Promise<SessionResponse | null> {
		const user = await this.userService.findById(userId);
		if (!user) return null;

		const credentials = await this.findCredentials(userId);
		return {
			user: UserService.toPublicUser(user),
			credentials: credentials.map(WebAuthnService.toPublicCredential),
			rpId: this.config.rpId
		};
	}

	async removeCredential(userId: string, id: string) {
		const count = await this.credentialRepository.countBy({ user: { id: userId } });
		if (count <= 1) {
			throw new BadRequestException({
				statusCode: 400,
				code: AuthErrorCode.LAST_CREDENTIAL,
				message: 'Add another passkey before removing your only one.'
			});
		}

		const credential = await this.credentialRepository.findOneBy({ id, user: { id: userId } });
		if (!credential) {
			throw new NotFoundException({
				statusCode: 404,
				code: AuthErrorCode.CREDENTIAL_NOT_FOUND,
				message: 'Passkey not found.'
			});
		}

		await this.credentialRepository.remove(credential);
	}

	private findCredentials(userId: string) {
		return this.credentialRepository.find({
			where: { user: { id: userId } },
			order: { createdAt: 'ASC' }
		});
	}

	private async takeCeremony(id: string, type: Ceremony['type']) {
		const ceremony = await this.challengeService.take(id);
		if (ceremony?.type !== type) {
			throw this.unauthorized(
				AuthErrorCode.CHALLENGE_NOT_FOUND,
				'Challenge expired or already used.'
			);
		}
		return ceremony;
	}

	private async verify<T>(run: () => Promise<T>) {
		try {
			return await run();
		} catch (error) {
			throw this.unauthorized(AuthErrorCode.VERIFICATION_FAILED, (error as Error).message);
		}
	}

	private unauthorized(code: AuthErrorCode, message: string) {
		return new UnauthorizedException({ statusCode: 401, code, message });
	}

	static toPublicCredential(credential: CredentialEntity): PublicCredential {
		return {
			id: credential.id,
			nickname: credential.nickname,
			deviceType: credential.deviceType,
			backedUp: credential.backedUp,
			transports: credential.transports,
			aaguid: credential.aaguid,
			provider: authenticatorName(credential.aaguid),
			signCount: credential.counter,
			createdAt: credential.createdAt.toISOString(),
			lastUsedAt: credential.lastUsedAt?.toISOString() ?? null
		};
	}
}
