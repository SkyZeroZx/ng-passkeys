import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	type Relation
} from 'typeorm';

import { CredentialEntity } from '../../auth/entities/credential.entity.js';

@Entity('users')
export class UserEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 32, unique: true })
	username: string;

	@Column({ type: 'varchar', length: 64 })
	displayName: string;

	// Random, never the username: it is stored unencrypted on the authenticator.
	@Index()
	@Column({ type: 'varchar', length: 64 })
	webauthnUserId: string;

	@OneToMany(() => CredentialEntity, (credential) => credential.user)
	credentials: Relation<CredentialEntity[]>;

	@CreateDateColumn()
	createdAt: Date;
}
