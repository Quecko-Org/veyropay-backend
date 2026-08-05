import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { GuardianStatus } from '@shared/enums';

// A guardian is a wallet-scoped, off-chain record - the guardian does not become a
// Safe owner or gain any on-chain capability by being added here. Actually granting
// a guardian recovery authority (an on-chain role) is the part still gated on
// docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1 - see RecoveryRequestService.
// No DB-level unique constraint on (walletId, guardianEmail) - a removed guardian can
// be re-invited later, and enforcing uniqueness only among non-removed rows needs a
// partial index this schema doesn't otherwise use. GuardianService checks for an
// existing active/invited guardian with the same email before inserting instead.
@Entity('guardians')
export class GuardianEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({ name: 'guardian_email' })
  guardianEmail!: string;

  @Column({ name: 'guardian_name', nullable: true })
  guardianName?: string;

  // Populated only if the guardian is also a platform user - not required, a guardian
  // can be an email-only contact who never signs up.
  @Column({ name: 'guardian_user_id', type: 'uuid', nullable: true })
  guardianUserId?: string;

  // The guardian's own EVM address (an EOA they control) - their on-chain identity for
  // SocialRecoveryModule guardian registration and EIP-712 recovery-approval signatures.
  // Nullable and set at invitation-acceptance time: a guardian can be invited and even
  // approve/reject informally before wiring a wallet, but on-chain execution requires it
  // (see RecoveryRequestService.executeRecovery).
  @Column({ name: 'guardian_address', nullable: true })
  guardianAddress?: string;

  @Column({ type: 'enum', enum: GuardianStatus, default: GuardianStatus.INVITED })
  status!: GuardianStatus;

  @Index({ unique: true })
  @Column({ name: 'invitation_token', unique: true })
  invitationToken!: string;

  @Column({ name: 'invited_at', type: 'timestamptz' })
  invitedAt!: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'removed_at', type: 'timestamptz', nullable: true })
  removedAt?: Date;
}
