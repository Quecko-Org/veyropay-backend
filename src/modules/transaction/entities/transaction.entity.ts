import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { TransactionStatus, TransactionType } from '@shared/enums';

@Entity('transactions')
export class TransactionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ nullable: true })
  provider?: string;

  @Column()
  chain!: string;

  @Column()
  asset!: string;

  @Column({ type: 'numeric', precision: 36, scale: 18 })
  amount!: string;

  @Column({ type: 'numeric', precision: 36, scale: 18, default: 0 })
  fee!: string;

  @Index()
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ name: 'tx_hash', nullable: true })
  txHash?: string;

  @Column({ name: 'provider_reference', nullable: true })
  providerReference?: string;
  // Populated when status is FAILED - the on-chain revert reason (from the
  // UserOperation receipt's `reason` field) or, for a submission-level failure, the
  // caught error's message.
  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;
}
