import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWebAuthnConfig } from './web-authn.config.js';

describe('parseWebAuthnConfig', () => {
	const env = (values: Record<string, string>) => values as NodeJS.ProcessEnv;

	it('accepts an origin whose host is the RP ID', () => {
		const config = parseWebAuthnConfig(
			env({ WEBAUTHN_RP_ID: 'example.com', WEBAUTHN_ORIGIN: 'https://example.com' })
		);
		assert.equal(config.rpId, 'example.com');
	});

	it('accepts a subdomain origin', () => {
		const config = parseWebAuthnConfig(
			env({ WEBAUTHN_RP_ID: 'example.com', WEBAUTHN_ORIGIN: 'https://app.example.com' })
		);
		assert.deepEqual(config.origins, ['https://app.example.com']);
	});

	it('rejects a different domain', () => {
		assert.throws(
			() =>
				parseWebAuthnConfig(
					env({ WEBAUTHN_RP_ID: 'evil.example', WEBAUTHN_ORIGIN: 'https://example.com' })
				),
			/registrable suffix/
		);
	});

	it('rejects a suffix that is not on a label boundary', () => {
		assert.throws(
			() =>
				parseWebAuthnConfig(
					env({ WEBAUTHN_RP_ID: 'example.com', WEBAUTHN_ORIGIN: 'https://notexample.com' })
				),
			/registrable suffix/
		);
	});

	it('rejects an RP ID with a scheme or a port', () => {
		for (const rpId of ['https://example.com', 'example.com:443']) {
			assert.throws(
				() =>
					parseWebAuthnConfig(
						env({ WEBAUTHN_RP_ID: rpId, WEBAUTHN_ORIGIN: 'https://example.com' })
					),
				/bare domain/
			);
		}
	});

	it('rejects an origin that is not a URL', () => {
		assert.throws(
			() =>
				parseWebAuthnConfig(env({ WEBAUTHN_RP_ID: 'example.com', WEBAUTHN_ORIGIN: 'example.com' })),
			/not a valid origin/
		);
	});

	it('defaults to localhost', () => {
		const config = parseWebAuthnConfig(env({}));
		assert.equal(config.rpId, 'localhost');
		assert.deepEqual(config.origins, ['http://localhost:4200']);
	});

	it('requires a session secret in production', () => {
		assert.throws(() => parseWebAuthnConfig(env({ NODE_ENV: 'production' })), /SESSION_SECRET/);
	});

	it('treats an empty session secret as missing on Vercel', () => {
		assert.throws(
			() => parseWebAuthnConfig(env({ VERCEL: '1', SESSION_SECRET: '' })),
			/SESSION_SECRET/
		);
	});
});
