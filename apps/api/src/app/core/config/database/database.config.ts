import { registerAs } from '@nestjs/config';

// pg is moving sslmode=require to libpq semantics, which skips certificate checks.
export const postgresUrl = () =>
	(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)?.replace(
		'sslmode=require',
		'sslmode=verify-full'
	);

export const databaseConfig = registerAs('database', () => {
	const url = postgresUrl();

	if (process.env.VERCEL && !url) {
		throw new Error('DATABASE_URL is required on Vercel: serverless instances do not share a disk');
	}

	return { url, logging: process.env.DATABASE_LOGGING === 'true' };
});
