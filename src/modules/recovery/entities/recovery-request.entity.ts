import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { RecoveryRequestStatus } from '@shared/enums';
import { RecoveryApprovalEntity } from './recovery-approval.entity';

@Entity('recovery_requests')
export class RecoveryRequestEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({ name: 'requested_by_email' })
  requestedByEmail!: string;

  @Column({ name: 'new_owner_address' })
  newOwnerAddress!: string;

  @Column({ name: 'required_approvals', type: 'int' })
  requiredApprovals!: number;

  @Column({
    type: 'enum',
    enum: RecoveryRequestStatus,
    default: RecoveryRequestStatus.PENDING,
  })
  status!: RecoveryRequestStatus;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt?: Date;

  @Column({ name: 'execution_tx_hash', nullable: true })
  executionTxHash?: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @Column({ name: 'recovery_hash', nullable: true })
  recoveryHash?: string;

  @OneToMany(() => RecoveryApprovalEntity, (approval) => approval.recoveryRequest)
  approvals?: RecoveryApprovalEntity[];
}
