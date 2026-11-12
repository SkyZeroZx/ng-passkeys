import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import type { PublicUser } from '@ng-passkeys/shared';

import { Session } from '../../../../services/session/session';
import { WebAuthn, describeError } from '../../../../services/web-authn/web-authn';

@Component({
	imports: [MatButtonModule, MatIconModule],
	selector: 'app-auth-options',
	styleUrl: './auth-options.scss',
	templateUrl: './auth-options.html'
})
export class AuthOptions {
	private readonly webAuthn = inject(WebAuthn);
	private readonly session = inject(Session);
	private readonly snackBar = inject(MatSnackBar);
	private readonly destroyRef = inject(DestroyRef);

	readonly user = input.required<PublicUser>();

	protected readonly busy = signal(false);
	protected readonly initial = computed(() => this.user().displayName.charAt(0).toUpperCase());

	// PublicKeyCredential.getClientCapabilities(), WebAuthn Level 3.
	private readonly capabilities = rxResource({ stream: () => this.webAuthn.capabilities() });

	protected readonly features = computed(() => {
		const capabilities = this.capabilities.hasValue() ? this.capabilities.value() : undefined;
		if (!capabilities) return [];

		return [
			{ label: 'Built-in authenticator', state: capabilities.userVerifyingPlatformAuthenticator },
			{ label: 'Phone via QR', state: capabilities.hybridTransport },
			{ label: 'Autofill', state: capabilities.conditionalGet },
			{ label: 'Signal API', state: capabilities.signalAllAcceptedCredentials }
		];
	});

	protected addPasskey() {
		this.busy.set(true);
		this.webAuthn
			.register(this.user().username)
			.pipe(
				finalize(() => this.busy.set(false)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe({
				next: () => {
					this.session.reload();
					this.snackBar.open('Passkey added');
				},
				error: (error) => this.snackBar.open(describeError(error))
			});
	}
}
