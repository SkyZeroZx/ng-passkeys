import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	FormField,
	disabled,
	form,
	maxLength,
	minLength,
	pattern,
	required
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { Observable, filter, finalize, from, switchMap } from 'rxjs';

import { Session } from '../../../../services/session/session';
import { WebAuthn, describeError } from '../../../../services/web-authn/web-authn';

@Component({
	imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
	selector: 'app-sign-in',
	styleUrl: './sign-in.scss',
	templateUrl: './sign-in.html'
})
export class SignIn {
	private readonly webAuthn = inject(WebAuthn);
	private readonly session = inject(Session);
	private readonly snackBar = inject(MatSnackBar);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly busy = signal(false);
	private readonly creating = signal(false);

	protected readonly model = signal({ username: '' });
	protected readonly signInForm = form(this.model, (path) => {
		required(path.username, { when: () => this.creating(), message: 'Choose a username' });
		minLength(path.username, 3, { when: () => this.creating(), message: 'At least 3 characters' });
		maxLength(path.username, 32, { message: 'At most 32 characters' });
		pattern(path.username, /^[a-zA-Z0-9._-]*$/, {
			message: 'Letters, numbers, dot, underscore and hyphen only'
		});
		disabled(path.username, { when: () => this.busy() });
	});

	constructor() {
		this.autofill();
		this.destroyRef.onDestroy(() => this.webAuthn.cancel());
	}

	protected signIn() {
		this.creating.set(false);
		this.run(this.webAuthn.login(this.model().username));
	}

	protected createAccount() {
		this.creating.set(true);
		this.run(this.webAuthn.register(this.model().username));
	}

	// Conditional UI: the browser offers passkeys inside the username field's autofill.
	private autofill() {
		from(browserSupportsWebAuthnAutofill())
			.pipe(
				filter(Boolean),
				switchMap(() => this.webAuthn.login(undefined, true)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe({
				next: () => this.session.reload(),
				// Nobody clicked anything, so a failed or cancelled request stays quiet.
				// Only the server's answer to a passkey picked from the list is worth showing.
				error: (error) => {
					if (error instanceof HttpErrorResponse) this.snackBar.open(describeError(error));
				}
			});
	}

	private run(ceremony: Observable<unknown>) {
		this.signInForm().markAsTouched();
		if (this.signInForm().invalid()) return;

		this.busy.set(true);
		ceremony
			.pipe(
				finalize(() => this.busy.set(false)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe({
				next: () => this.session.reload(),
				error: (error) => {
					this.snackBar.open(describeError(error));
					this.autofill();
				}
			});
	}
}
