import { registerAs } from '@nestjs/config';

import { postgresUrl } from '../database/database.config.js';

export const cacheConfig = registerAs('cache', () => {
	const redisUrl = process.env.REDIS_URL ?? process.env.KV_URL;
	const databaseUrl = postgresUrl();

	if (process.env.VERCEL && !redisUrl && !databaseUrl) {
		throw new Error(
			'Set REDIS_URL or DATABASE_URL on Vercel: serverless instances do not share memory'
		);
	}

	return {
		redisUrl,
		databaseUrl,
		store: redisUrl ? 'redis' : databaseUrl ? 'postgres' : 'memory',
		ttl: Number(process.env.CHALLENGE_TTL_SECONDS ?? 300) * 1000
	};
});
