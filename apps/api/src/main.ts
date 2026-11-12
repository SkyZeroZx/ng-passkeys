import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app/app.module.js';
import { configureApp } from './app/setup.js';

const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));

app.enableShutdownHooks();
await app.listen(process.env.PORT ?? 3000);
