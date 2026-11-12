import { HttpClient, httpResource } from '@angular/common/http';
import { Service, computed, inject } from '@angular/core';
import { tap } from 'rxjs';

import type { SessionResponse } from '@ng-passkeys/shared';

@Service()
export class Session {
	private readonly http = inject(HttpClient);
	private readonly session = httpResource<SessionResponse | null>(() => '/api/auth/session');

	readonly current = computed(() => (this.session.hasValue() ? this.session.value() : null));
	readonly user = computed(() => this.current()?.user ?? null);
	readonly credentials = computed(() => this.current()?.credentials ?? []);
	readonly loading = this.session.isLoading;

	reload() {
		this.session.reload();
	}

	logout() {
		return this.http.post<void>('/api/auth/logout', {}).pipe(tap(() => this.session.set(null)));
	}
}
