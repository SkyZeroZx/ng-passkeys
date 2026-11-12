import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app/app.module.js';
import { configureApp } from './app/setup.js';

export async function createServer() {
	const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
	await app.init();
	return app.getHttpAdapter().getInstance();
}
