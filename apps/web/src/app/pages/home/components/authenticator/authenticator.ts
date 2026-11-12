import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import type { PublicCredential } from '@ng-passkeys/shared';

@Component({
	imports: [DatePipe, MatButtonModule, MatIconModule],
	selector: 'app-authenticator',
	styleUrl: './authenticator.scss',
	templateUrl: './authenticator.html'
})
export class Authenticator {
	readonly credential = input.required<PublicCredential>();
	readonly removable = input(false);
	readonly remove = output();

	protected readonly icon = computed(() =>
		this.credential().transports.some((transport) => ['usb', 'nfc', 'ble'].includes(transport))
			? 'key'
			: 'fingerprint'
	);
}
