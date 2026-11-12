import { expect, test, type Page } from '@playwright/test';

// Behaves like Touch ID or Windows Hello with a synced passkey: it verifies the
// user, keeps discoverable credentials and reports them as backed up.
async function addPlatformAuthenticator(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
			defaultBackupEligibility: true,
			defaultBackupState: true
		}
	});

	// A real browser waits for the user to pick a passkey from the autofill list.
	// The virtual one answers at once, so autofill would sign straight back in.
	return {
		userPresent: (enabled: boolean) =>
			cdp.send('WebAuthn.setAutomaticPresenceSimulation', { authenticatorId, enabled })
	};
}

async function createAccount(page: Page, username: string) {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Sign in with a passkey' })).toBeVisible();
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByRole('heading', { name: `Hi, ${username}` })).toBeVisible();
}

const newUsername = () => `e2e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

test('creates an account with a synced passkey', async ({ page }) => {
	await addPlatformAuthenticator(page);
	await createAccount(page, newUsername());

	await expect(page.getByText('Synced')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Remove passkey' })).toBeDisabled();
});

test('signs back in without typing a username', async ({ page }) => {
	const authenticator = await addPlatformAuthenticator(page);
	const username = newUsername();
	await createAccount(page, username);

	await authenticator.userPresent(false);
	const autofillStarted = page.waitForResponse('**/api/auth/login/options');
	await page.getByRole('button', { name: 'Sign out' }).click();
	await autofillStarted;
	// Give the autofill request time to reach the authenticator while nobody can answer it.
	// It then stays pending, and the button aborts it and asks again.
	await page.waitForTimeout(1000);

	await authenticator.userPresent(true);
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await expect(page.getByRole('heading', { name: `Hi, ${username}` })).toBeVisible();
});

test('offers the passkey in the autofill list', async ({ page }) => {
	const authenticator = await addPlatformAuthenticator(page);
	const username = newUsername();
	await createAccount(page, username);

	await authenticator.userPresent(false);
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByRole('heading', { name: 'Sign in with a passkey' })).toBeVisible();

	// The virtual authenticator picks the passkey from the list on its own.
	await authenticator.userPresent(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: `Hi, ${username}` })).toBeVisible();
});

test('refuses a username that is already registered', async ({ page }) => {
	const authenticator = await addPlatformAuthenticator(page);
	const username = newUsername();
	await createAccount(page, username);

	await authenticator.userPresent(false);
	await page.getByRole('button', { name: 'Sign out' }).click();
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByText('That username is already registered.')).toBeVisible();
});

test('checks the username before asking for a passkey', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText('Choose a username')).toBeVisible();

	await page.getByLabel('Username').fill('ana quispe');
	await expect(page.getByText('Letters, numbers, dot, underscore and hyphen only')).toBeVisible();
});
