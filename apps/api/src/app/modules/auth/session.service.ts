import { randomUUID } from 'node:crypto';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CookieOptions, Request, Response } from 'express';

import { cacheConfig, webAuthnConfig } from '../../core/config/index.js';

const SESSION_COOKIE = 'session';
const CEREMONY_COOKIE = 'ceremony';

@Injectable()
export class SessionService {
	constructor(
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
		@Inject(webAuthnConfig.KEY)
		private readonly webAuthn: ConfigType<typeof webAuthnConfig>,
		@Inject(cacheConfig.KEY)
		private readonly cache: ConfigType<typeof cacheConfig>
	) {}

	// Points at the pending challenge without sending the challenge itself to the browser.
	setCeremony(res: Response, ceremonyId: string) {
		res.cookie(CEREMONY_COOKIE, ceremonyId, this.cookie(this.cache.ttl));
	}

	readCeremony(req: Request): string {
		return req.signedCookies?.[CEREMONY_COOKIE] ?? '';
	}

	clearCeremony(res: Response) {
		res.clearCookie(CEREMONY_COOKIE, { path: '/' });
	}

	async start(res: Response, userId: string) {
		const id = randomUUID();
		const ttl = this.webAuthn.sessionTtl * 1000;

		await this.cacheManager.set(this.key(id), userId, ttl);
		res.cookie(SESSION_COOKIE, id, this.cookie(ttl));
	}

	async userId(req: Request) {
		const id: string | undefined = req.signedCookies?.[SESSION_COOKIE];
		return id ? this.cacheManager.get<string>(this.key(id)) : undefined;
	}

	async end(req: Request, res: Response) {
		const id: string | undefined = req.signedCookies?.[SESSION_COOKIE];
		if (id) await this.cacheManager.del(this.key(id));
		res.clearCookie(SESSION_COOKIE, { path: '/' });
	}

	private cookie(maxAge: number): CookieOptions {
		return {
			httpOnly: true,
			sameSite: 'lax',
			secure: this.webAuthn.origins.every((origin) => origin.startsWith('https://')),
			signed: true,
			path: '/',
			maxAge
		};
	}

	private key(id: string) {
		return `session:${id}`;
	}
}
