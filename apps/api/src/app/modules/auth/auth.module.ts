import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { ChallengeService } from './challenge.service.js';
import { CredentialEntity } from './entities/credential.entity.js';
import { SessionGuard } from './guards/session.guard.js';
import { SessionService } from './session.service.js';
import { WebAuthnService } from './web-authn.service.js';

@Module({
	imports: [TypeOrmModule.forFeature([CredentialEntity]), UserModule],
	controllers: [AuthController],
	providers: [WebAuthnService, ChallengeService, SessionService, SessionGuard]
})
export class AuthModule {}
