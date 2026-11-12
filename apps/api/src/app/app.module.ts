import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller.js';
import {
	CacheConfigModule,
	DatabaseConfigModule,
	cacheConfig,
	databaseConfig,
	webAuthnConfig
} from './core/config/index.js';
import { AllExceptionFilter } from './core/filters/index.js';
import { AuthModule, UserModule } from './modules/index.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			load: [webAuthnConfig, databaseConfig, cacheConfig]
		}),
		CacheConfigModule,
		DatabaseConfigModule,
		UserModule,
		AuthModule
	],
	controllers: [AppController],
	providers: [{ provide: APP_FILTER, useClass: AllExceptionFilter }]
})
export class AppModule {}
