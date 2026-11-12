import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';

import { CredentialDeviceType } from '@ng-passkeys/shared';

import { UserEntity } from '../../user/entities/user.entity.js';

@Entity('credentials')
export class CredentialEntity {
	@PrimaryColumn({ type: 'varchar', length: 512 })
	id: string;

	@ManyToOne(() => UserEntity, (user) => user.credentials, { onDelete: 'CASCADE' })
	user: Relation<UserEntity>;

	// bytea on Postgres and blob on SQLite differ, so the key is stored as base64url text.
	@Column({
		type: 'text',
		transformer: {
			to: (value: Uint8Array) => Buffer.from(value).toString('base64url'),
			from: (value: string) => Buffer.from(value, 'base64url')
		}
	})
	publicKey: Buffer;

	@Column({
		type: 'bigint',
		default: 0,
		transformer: { to: (value: number) => value, from: (value: string) => Number(value) }
	})
	counter: number;

	@Column({ type: 'simple-array', default: '' })
	transports: string[];

	@Column({ type: 'varchar', length: 16 })
	deviceType: CredentialDeviceType;

	@Column({ default: false })
	backedUp: boolean;

	@Column({ type: 'varchar', length: 64, default: '' })
	aaguid: string;

	@Column({ type: 'varchar', length: 48, default: '' })
	nickname: string;

	@CreateDateColumn()
	createdAt: Date;

	@Column({ nullable: true })
	lastUsedAt?: Date;
}
