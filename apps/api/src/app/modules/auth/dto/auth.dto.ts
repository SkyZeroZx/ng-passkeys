import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';

const normalize = ({ value }: { value: unknown }) =>
	typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterOptionsDto {
	@Transform(normalize)
	@IsString()
	@Length(3, 32)
	@Matches(/^[a-z0-9._-]+$/, {
		message: 'username may only contain letters, numbers, dot, underscore and hyphen'
	})
	username: string;

	@IsOptional()
	@IsString()
	@Length(1, 64)
	displayName?: string;
}

export class LoginOptionsDto {
	@IsOptional()
	@Transform(normalize)
	@IsString()
	@Length(3, 32)
	username?: string;
}

export class VerifyDto {
	@IsObject()
	response: Record<string, unknown>;

	@IsOptional()
	@IsString()
	@Length(1, 48)
	nickname?: string;
}
