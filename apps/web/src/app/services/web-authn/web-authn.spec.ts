import { HttpErrorResponse } from '@angular/common/http';
import { WebAuthnError } from '@simplewebauthn/browser';

import { describeError } from './web-authn';

describe('describeError', () => {
	it('explains a passkey that already exists on this device', () => {
		const error = new WebAuthnError({
			message: 'already registered',
			code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
			cause: new Error()
		});
		expect(describeError(error)).toBe('This device already has a passkey for this account.');
	});

	it('uses the message the API sent', () => {
		const error = new HttpErrorResponse({
			status: 409,
			error: {
				statusCode: 409,
				code: 'USERNAME_TAKEN',
				message: 'That username is already registered.'
			}
		});
		expect(describeError(error)).toBe('That username is already registered.');
	});

	it('reads a closed passkey sheet as a cancellation', () => {
		const message = 'The operation either timed out or was not allowed.';
		const error = new WebAuthnError({
			message,
			code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
			cause: new DOMException(message, 'NotAllowedError')
		});
		expect(describeError(error)).toBe('Cancelled or timed out.');
	});
});
