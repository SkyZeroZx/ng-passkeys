import { registerAs } from '@nestjs/config';

export interface WebAuthnConfig {
	rpId: string;
	rpName: string;
	origins: string[];
	sessionSecret: string;
	sessionTtl: number;
}

const list = (value?: string) =>
	(value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

// A wrong RP ID does not fail here, it fails later in the browser on every ceremony.
export function assertRpIdMatchesOrigins(rpId: string, origins: string[]) {
	if (rpId.includes(':')) {
		throw new Error(`WEBAUTHN_RP_ID must be a bare domain like "example.com", got "${rpId}"`);
	}

	for (const origin of origins) {
		let host: string;
		try {
			host = new URL(origin).hostname;
		} catch {
			throw new Error(`WEBAUTHN_ORIGIN "${origin}" is not a valid origin`);
		}

		if (host !== rpId && !host.endsWith(`.${rpId}`)) {
			throw new Error(`RP ID "${rpId}" is not a registrable suffix of "${origin}"`);
		}
	}
}

export function parseWebAuthnConfig(env: NodeJS.ProcessEnv): WebAuthnConfig {
	const rpId = env.WEBAUTHN_RP_ID || 'localhost';
	const origins = list(env.WEBAUTHN_ORIGIN);
	if (!origins.length) {
		origins.push('http://localhost:4200');
	}

	assertRpIdMatchesOrigins(rpId, origins);

	if ((env.NODE_ENV === 'production' || env.VERCEL) && !env.SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required in production');
	}

	return {
		rpId,
		rpName: env.WEBAUTHN_RP_NAME || 'ng-passkeys',
		origins,
		sessionSecret: env.SESSION_SECRET || 'dev-secret',
		sessionTtl: Number(env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7)
	};
}

export const webAuthnConfig = registerAs('webauthn', () => parseWebAuthnConfig(process.env));
