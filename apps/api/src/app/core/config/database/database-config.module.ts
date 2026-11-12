import { mkdirSync } from 'node:fs';

import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { databaseConfig } from './database.config.js';

function typeOrmOptions({ url, logging }: ConfigType<typeof databaseConfig>): TypeOrmModuleOptions {
	const common = { autoLoadEntities: true, synchronize: true, logging };

	if (url) {
		return { type: 'postgres', url, ...common };
	}

	// sql.js is SQLite compiled to WebAssembly, so local development needs no native build.
	mkdirSync('.data', { recursive: true });
	return { type: 'sqljs', location: '.data/ng-passkeys.sqlite', autoSave: true, ...common };
}

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			inject: [databaseConfig.KEY],
			useFactory: typeOrmOptions
		})
	]
})
export class DatabaseConfigModule {}
