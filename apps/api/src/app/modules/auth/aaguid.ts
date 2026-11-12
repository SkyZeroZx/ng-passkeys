// Subset of https://github.com/passkeydeveloper/passkey-authenticator-aaguids
const AAGUIDS: Record<string, string> = {
	'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google Password Manager',
	'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome on macOS',
	'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': 'iCloud Keychain',
	'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': 'iCloud Keychain (Managed)',
	'08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
	'9ddd1817-af5a-4672-a2b9-3e3dd95000a9': 'Windows Hello',
	'6028b017-b1d4-4c02-b4b3-afcdafc96bb2': 'Windows Hello',
	'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
	'd548826e-79b4-db40-a3d8-11116f7e8349': 'Bitwarden',
	'531126d6-e717-415c-9320-3d9aa6981239': 'Dashlane',
	'0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6': 'Keeper',
	'b84e4048-15dc-4dd0-8640-f4f60813c8af': 'NordPass',
	'f8a011f3-8c0a-4d15-8006-17111f9edc7d': 'YubiKey 5 Series',
	'2fc0579f-8113-47ea-b116-bb5a8db9202a': 'YubiKey 5 Series (NFC)',
	'cb69481e-8ff7-4039-93ec-0a2729a154a8': 'YubiKey 5 Series',
	'd8522d9f-575b-4866-88a9-ba99fa02f35b': 'YubiKey Bio Series',
	'73bb0cd4-e502-49b8-9c6f-b59445bf720b': 'Google Titan Security Key',
	'b93fd961-f2e6-462f-b122-82002247de78': 'Android Credential Manager'
};

export function authenticatorName(aaguid: string) {
	return AAGUIDS[aaguid.toLowerCase()] ?? null;
}

export function defaultNickname(aaguid: string, transports: string[]) {
	if (authenticatorName(aaguid)) return authenticatorName(aaguid)!;
	if (transports.includes('usb') || transports.includes('nfc')) return 'Security key';
	if (transports.includes('hybrid')) return 'Phone or tablet';
	return 'Passkey';
}
