import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Session } from '../../services/session/session';

@Component({
	imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
	selector: 'app-nav-bar',
	styleUrl: './nav-bar.scss',
	templateUrl: './nav-bar.html'
})
export class NavBar {
	protected readonly session = inject(Session);

	protected logout() {
		this.session.logout().subscribe();
	}
}
