import { Component, computed, input } from '@angular/core';

const decodeJson = (base64url: string) =>
	JSON.parse(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')));

@Component({
	selector: 'app-json-viewer',
	styleUrl: './json-viewer.scss',
	templateUrl: './json-viewer.html'
})
export class JsonViewer {
	readonly value = input<{ response: { clientDataJSON: string } }>();

	// clientDataJSON travels as base64url; decoded, it shows the origin and the challenge.
	protected readonly json = computed(() => {
		const value = this.value();
		if (!value) return '';

		const clientDataJSON = decodeJson(value.response.clientDataJSON);
		return JSON.stringify({ ...value, response: { ...value.response, clientDataJSON } }, null, 2);
	});
}
