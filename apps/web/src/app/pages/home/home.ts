import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, switchMap } from 'rxjs';

import type { PublicCredential } from '@ng-passkeys/shared';

import { Session } from '../../services/session/session';
import { WebAuthn, describeError } from '../../services/web-authn/web-authn';
import { JsonViewer } from '../../shared/json-viewer/json-viewer';
import { AuthOptions } from './components/auth-options/auth-options';
import { Authenticator } from './components/authenticator/authenticator';
import { SignIn } from './components/sign-in/sign-in';

@Component({
	imports: [AuthOptions, Authenticator, JsonViewer, SignIn],
	selector: 'app-home',
	styleUrl: './home.scss',
	templateUrl: './home.html'
})
export class Home {
	protected readonly session = inject(Session);
	protected readonly webAuthn = inject(WebAuthn);
	private readonly snackBar = inject(MatSnackBar);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		// Keep the browser's passkey list in step with what the server still accepts.
		toObservable(this.session.current)
			.pipe(
				filter((session) => session !== null),
				switchMap((session) => this.webAuthn.syncAcceptedCredentials(session)),
				takeUntilDestroyed()
			)
			.subscribe();
	}

	protected remove({ id }: PublicCredential) {
		this.webAuthn
			.removeCredential(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.session.reload();
					this.snackBar.open('Passkey removed');
				},
				error: (error) => this.snackBar.open(describeError(error))
			});
	}
}
