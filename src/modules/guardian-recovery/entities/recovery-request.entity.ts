import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { RecoveryRequestStatus } from '@shared/enums';

// Off-chain approval ledger for guardian-based wallet recovery. Creating a request
// and collecting guardian approvals is fully implemented; actually executing the
// approved recovery on-chain (swapping the Safe owner) is NOT - see
// RecoveryRequestService.executeRecovery() and docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
@Entity('recovery_requests')
export class RecoveryRequestEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  // Contact info for whoever initiated recovery - they've lost account access, so this
  // is not necessarily an authenticated userId.
  @Column({ name: 'requested_by_email' })
  requestedByEmail!: string;

  // The new Turnkey-provisioned owner address recovery would swap in as the Safe's
  // owner once approved and executed.
  @Column({ name: 'new_owner_address' })
  newOwnerAddress!: string;

  // Snapshot of the guardian count/threshold policy at request time, so a later
  // change to the guardian list doesn't retroactively change what this request needs.
  @Column({ name: 'required_approvals', type: 'int' })
  requiredApprovals!: number;

  @Column({ type: 'enum', enum: RecoveryRequestStatus, default: RecoveryRequestStatus.PENDING })
  status!: RecoveryRequestStatus;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt?: Date;

  // Populated only once on-chain execution (currently unimplemented) actually runs.
  @Column({ name: 'execution_tx_hash', nullable: true })
  executionTxHash?: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  // The SocialRecoveryModule EIP-712 recovery hash (getRecoveryHash(wallet, newOwners,
  // newThreshold, nonce)) guardians must sign to approve this specific request on-chain.
  // Computed once at request creation (requires the module already enabled on the
  // wallet - see GuardianService module-setup flow) and never recomputed, so a guardian
  // signature always covers exactly this request's parameters - the on-chain nonce
  // input is what prevents a signature being replayable against a later request.
  @Column({ name: 'recovery_hash', nullable: true })
  recoveryHash?: string;
}
