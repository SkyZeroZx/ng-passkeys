import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PublicUser } from '@ng-passkeys/shared';

import { UserEntity } from './entities/user.entity.js';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>
	) {}

	findById(id: string) {
		return this.userRepository.findOneBy({ id });
	}

	findByUsername(username: string) {
		return this.userRepository.findOneBy({ username });
	}

	static toPublicUser(user: UserEntity): PublicUser {
		return {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			userHandle: Buffer.from(user.webauthnUserId).toString('base64url'),
			createdAt: user.createdAt.toISOString()
		};
	}
}
