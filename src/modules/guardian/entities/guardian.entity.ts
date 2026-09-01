import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { GuardianRelationship, GuardianStatus } from '@shared/enums';

@Entity('guardians')
export class GuardianEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({ name: 'guardian_email' })
  guardianEmail!: string;

  @Column({ name: 'guardian_name', nullable: true })
  guardianName?: string;

  @Index()
  @Column({ name: 'guardian_user_id', type: 'uuid', nullable: true })
  guardianUserId?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'guardian_user_id' })
  guardianUser?: UserEntity;

  @Column({ name: 'guardian_address', nullable: true })
  guardianAddress?: string;

  @Column({
    type: 'enum',
    enum: GuardianStatus,
    default: GuardianStatus.INVITED,
  })
  status!: GuardianStatus;

  @Column({
    type: 'enum',
    enum: GuardianRelationship,
    nullable: true,
  })
  relationship?: GuardianRelationship;

  @Column({ name: 'can_approve_recovery', default: true })
  canApproveRecovery!: boolean;

  @Column({ name: 'can_move_funds', default: false })
  canMoveFunds!: boolean;

  @Column({ name: 'can_see_balance', default: false })
  canSeeBalance!: boolean;

  @Column({ name: 'can_be_removed', default: true })
  canBeRemoved!: boolean;

  @Column({ name: 'invitation_token', unique: true })
  invitationToken!: string;

  @Column({ name: 'invited_at', type: 'timestamptz' })
  invitedAt!: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'removed_at', type: 'timestamptz', nullable: true })
  removedAt?: Date;
}
