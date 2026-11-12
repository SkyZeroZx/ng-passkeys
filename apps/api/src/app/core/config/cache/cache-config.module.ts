import { createKeyv as createPostgresStore } from '@keyv/postgres';
import { createKeyv as createRedisStore } from '@keyv/redis';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { cacheConfig } from './cache.config.js';

function cacheOptions({
	redisUrl,
	databaseUrl,
	ttl
}: ConfigType<typeof cacheConfig>): CacheModuleOptions {
	if (redisUrl) {
		return { ttl, stores: [createRedisStore(redisUrl)] };
	}

	// Without Redis, serverless instances still need one store they all see.
	if (databaseUrl) {
		return { ttl, stores: [createPostgresStore({ uri: databaseUrl, table: 'cache' })] };
	}

	return { ttl };
}

@Module({
	imports: [
		CacheModule.registerAsync({
			isGlobal: true,
			inject: [cacheConfig.KEY],
			useFactory: cacheOptions
		})
	]
})
export class CacheConfigModule {}
