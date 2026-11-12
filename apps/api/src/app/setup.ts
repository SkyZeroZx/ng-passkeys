import { ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

import { webAuthnConfig } from './core/config/index.js';

export function configureApp(app: NestExpressApplication) {
	const { sessionSecret, origins } = app.get<ConfigType<typeof webAuthnConfig>>(webAuthnConfig.KEY);

	app.use(cookieParser(sessionSecret));
	app.setGlobalPrefix('api');
	app.useGlobalPipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
	);
	app.enableCors({ origin: origins, credentials: true });
	app.set('trust proxy', 1);

	return app;
}
