import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import {
	WebAuthnAbortService,
	WebAuthnError,
	browserSupportsWebAuthn,
	getBrowserCapabilities,
	sendSignal,
	startAuthentication,
	startRegistration
} from '@simplewebauthn/browser';
import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON
} from '@simplewebauthn/browser';
import { catchError, from, of, switchMap, tap, throwError } from 'rxjs';

import {
	AuthErrorCode,
	type ApiErrorBody,
	type SessionResponse,
	type VerifiedAuthenticationResponse,
	type VerifiedRegistrationResponse
} from '@ng-passkeys/shared';

@Service()
export class WebAuthn {
	private readonly http = inject(HttpClient);

	readonly lastResponse = signal<RegistrationResponseJSON | AuthenticationResponseJSON | undefined>(
		undefined
	);

	capabilities() {
		return browserSupportsWebAuthn() ? from(getBrowserCapabilities()) : of(undefined);
	}

	register(username: string) {
		return this.http
			.post<PublicKeyCredentialCreationOptionsJSON>('/api/auth/register/options', { username })
			.pipe(
				switchMap((optionsJSON) => startRegistration({ optionsJSON })),
				tap((response) => this.lastResponse.set(response)),
				switchMap((response) =>
					this.http.post<VerifiedRegistrationResponse>('/api/auth/register/verify', { response })
				)
			);
	}

	login(username?: string, useBrowserAutofill = false) {
		return this.http
			.post<PublicKeyCredentialRequestOptionsJSON>('/api/auth/login/options', {
				username: username || undefined
			})
			.pipe(switchMap((optionsJSON) => this.authenticate(optionsJSON, useBrowserAutofill)));
	}

	removeCredential(id: string) {
		return this.http.delete<void>(`/api/auth/credentials/${encodeURIComponent(id)}`);
	}

	syncAcceptedCredentials({ rpId, user, credentials }: SessionResponse) {
		return this.broadcast({
			signalName: 'allAcceptedCredentials',
			rpID: rpId,
			userID: user.userHandle,
			allAcceptedCredentialIDs: credentials.map(({ id }) => id)
		});
	}

	cancel() {
		WebAuthnAbortService.cancelCeremony();
	}

	private authenticate(
		optionsJSON: PublicKeyCredentialRequestOptionsJSON,
		useBrowserAutofill: boolean
	) {
		return from(startAuthentication({ optionsJSON, useBrowserAutofill })).pipe(
			tap((response) => this.lastResponse.set(response)),
			switchMap((response) =>
				this.http.post<VerifiedAuthenticationResponse>('/api/auth/login/verify', { response }).pipe(
					// The server no longer knows this passkey: ask the browser to stop offering it.
					catchError((error) =>
						errorCode(error) === AuthErrorCode.CREDENTIAL_NOT_FOUND && optionsJSON.rpId
							? this.broadcast({
									signalName: 'unknownCredential',
									rpID: optionsJSON.rpId,
									credentialID: response.id
								}).pipe(switchMap(() => throwError(() => error)))
							: throwError(() => error)
					)
				)
			)
		);
	}

	// Signals are best effort: browsers without the Signal API simply ignore them.
	private broadcast(options: Parameters<typeof sendSignal>[0]) {
		return from(sendSignal(options)).pipe(catchError(() => of(undefined)));
	}
}

const errorCode = (error: unknown) =>
	error instanceof HttpErrorResponse ? (error.error as ApiErrorBody | null)?.code : undefined;

export function describeError(error: unknown) {
	if (error instanceof WebAuthnError) {
		switch (error.code) {
			case 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED':
				return 'This device already has a passkey for this account.';
			case 'ERROR_INVALID_RP_ID':
			case 'ERROR_INVALID_DOMAIN':
				return 'The RP ID does not match this domain.';
		}
		return error.name === 'NotAllowedError' ? 'Cancelled or timed out.' : error.message;
	}

	if (error instanceof HttpErrorResponse) {
		return (error.error as ApiErrorBody | null)?.message ?? error.message;
	}

	return 'Something went wrong.';
}
