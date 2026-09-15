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

  // For a SWAP, this is the DESTINATION side (what was swapped TO) - see fromChain/
  // fromAsset below for the source side. For a TRANSFER or DEPOSIT there's only one
  // side, so this is just "the" chain/asset.
  @Column()
  chain!: string;

  @Column()
  asset!: string;

  // Amount SENT (source side) - for a SWAP, `chain`/`asset` above describe the
  // destination, so pairing this amount with them is misleading on its own; use
  // fromChain/fromAsset for the source side and receivedAmount for what actually
  // arrived. Not meaningful to split for a TRANSFER/DEPOSIT (only one side exists).
  @Column({ type: 'numeric', precision: 36, scale: 18 })
  amount!: string;

  // Source chain/asset for a SWAP only - `chain`/`asset` above already describe the
  // destination side. Left unset for TRANSFER/DEPOSIT, which have only one side.
  @Column({ name: 'from_chain', nullable: true })
  fromChain?: string;

  @Column({ name: 'from_asset', nullable: true })
  fromAsset?: string;

  // Actual amount received in the destination asset - for a SWAP only. Recorded as a
  // quoted estimate at execute time (ExecuteSwapDto.toAmount), then overwritten with
  // LiFi's own reported real amount once a cross-chain bridge transfer completes (see
  // SwapService.finalizeOnceReceiptKnown) - a same-chain swap keeps the quoted figure,
  // since nothing later reports the real on-chain amount back to us.
  @Column({ name: 'received_amount', type: 'numeric', precision: 36, scale: 18, nullable: true })
  receivedAmount?: string;

  // Veyro's own platform revenue fee - only applies to a SWAP (the 1inch/LiFi
  // referrer cut baked into the swap rate, client-supplied at preview/execute time).
  // Always 0 for a TRANSFER (a plain send has no platform fee).
  @Column({ type: 'numeric', precision: 36, scale: 18, default: 0 })
  fee!: string;

  @Index()
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ name: 'tx_hash', nullable: true })
  txHash?: string;

  @Column({ name: 'provider_reference', nullable: true })
  providerReference?: string;

  // Recipient address - only meaningful for a TRANSFER (a SWAP's output lands back on
  // the same Safe that initiated it, so there's no distinct recipient to record).
  @Column({ name: 'to_address', nullable: true })
  toAddress?: string;

  // Sender address - only meaningful for a DEPOSIT (an incoming transfer detected via
  // the Alchemy Address Activity webhook, since nothing else records this direction).
  @Column({ name: 'from_address', nullable: true })
  fromAddress?: string;

  // Populated when status is FAILED - the on-chain revert reason (from the
  // UserOperation receipt's `reason` field) or, for a submission-level failure, the
  // caught error's message. Previously this information only ever reached the server
  // logs, with no way for an API consumer to see why a transaction failed.
  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;
}