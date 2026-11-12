export type CredentialDeviceType = 'singleDevice' | 'multiDevice';

export interface PublicUser {
	id: string;
	username: string;
	displayName: string;
	/** base64url user handle, as the Signal API expects it */
	userHandle: string;
	createdAt: string;
}

export interface PublicCredential {
	id: string;
	nickname: string;
	/** BE flag: multiDevice means the passkey may sync */
	deviceType: CredentialDeviceType;
	/** BS flag: the passkey is backed up right now */
	backedUp: boolean;
	transports: string[];
	aaguid: string;
	provider: string | null;
	signCount: number;
	createdAt: string;
	lastUsedAt: string | null;
}

export interface SessionResponse {
	user: PublicUser;
	credentials: PublicCredential[];
	rpId: string;
}

export interface VerifiedRegistrationResponse {
	verified: boolean;
	user: PublicUser;
	credential: PublicCredential;
}

export interface VerifiedAuthenticationResponse {
	verified: boolean;
	user: PublicUser;
	credentialId: string;
}

export interface ApiErrorBody {
	statusCode: number;
	code: string;
	message: string;
}
