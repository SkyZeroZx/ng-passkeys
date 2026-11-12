import { randomUUID } from 'node:crypto';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface Ceremony {
	type: 'registration' | 'authentication';
	challenge: string;
	userId?: string;
	username?: string;
	displayName?: string;
	webauthnUserId?: string;
}

@Injectable()
export class ChallengeService {
	constructor(
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache
	) {}

	async save(ceremony: Ceremony) {
		const id = randomUUID();
		await this.cacheManager.set(this.key(id), ceremony);
		return id;
	}

	// A challenge is valid once. The cache TTL expires the ones nobody finishes.
	async take(id: string) {
		if (!id) return undefined;

		const ceremony = await this.cacheManager.get<Ceremony>(this.key(id));
		await this.cacheManager.del(this.key(id));
		return ceremony;
	}

	private key(id: string) {
		return `challenge:${id}`;
	}
}
