import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletStatus } from '@shared/enums';

@Entity('wallets')
export class WalletEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  // Named neutrally rather than doc06's literal "safeAddress" - which smart account
  // provider backs this address is an open architecture decision, see
  // docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1. Nullable because a Wallet row exists in
  // PENDING_PROVIDER status before any address can be assigned.
  @Column({ name: 'smart_account_address', nullable: true })
  smartAccountAddress?: string;

  // Turnkey-controlled EOA that is the sole owner/signer of the Safe above. Nullable
  // until smart account provisioning runs (see WalletService.requestSmartAccountProvisioning).
  @Column({ name: 'owner_address', nullable: true })
  ownerAddress?: string;

  @Column({ name: 'chain_id' })
  chainId!: number;

  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.PENDING_PROVIDER })
  status!: WalletStatus;

  // Configurable N-of-M guardian recovery threshold (e.g. 2-of-3, 3-of-5). Nullable -
  // when unset, RecoveryRequestService falls back to requiring every active guardian to
  // approve (the original MVP policy). Set via GuardianService.setGuardianThreshold(),
  // validated against the current active guardian count at write time and re-validated
  // against it again at recovery-request-creation time.
  @Column({ name: 'guardian_threshold', type: 'int', nullable: true })
  guardianThreshold?: number;
}
