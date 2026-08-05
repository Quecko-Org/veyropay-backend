import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from './user.entity';

// Maps our internal user to identifiers issued by third-party providers
// (Rain customer ID, Sumsub applicant ID, Baanx customer ID, ...) so those
// IDs don't need to be duplicated as columns across every module.
// Turnkey's user ID is the one exception - it lives directly on UserEntity
// since it's how a user is looked up on every login.
@Entity('provider_references')
@Index(['userId', 'provider'], { unique: true })
export class ProviderReferenceEntity extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ name: 'reference_id' })
  referenceId!: string;
}
