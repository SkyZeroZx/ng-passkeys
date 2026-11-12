import { defineConfig, devices } from '@playwright/test';

// Set BASE_URL to run against a deployment instead of local servers.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4200';
const local = !process.env.BASE_URL;

export default defineConfig({
	testDir: './e2e',
	timeout: 60_000,
	// A deployment that has been idle starts cold: the function boots and the database wakes up.
	expect: { timeout: local ? 5_000 : 15_000 },
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL, trace: 'retain-on-failure' },
	// The virtual authenticator is a Chrome DevTools Protocol feature, so Chromium only.
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: local
		? [
				{
					command: 'node dist/apps/api/src/main.js',
					url: 'http://localhost:3000/api/health',
					reuseExistingServer: !process.env.CI
				},
				{
					command: 'npx nx serve web',
					url: 'http://localhost:4200',
					reuseExistingServer: !process.env.CI,
					timeout: 120_000
				}
			]
		: undefined
});
