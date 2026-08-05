import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { TransactionStatus } from '@shared/enums';
import { CardEntity } from './card.entity';

@Entity('card_transactions')
export class CardTransactionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'card_id' })
  cardId!: string;

  @ManyToOne(() => CardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card!: CardEntity;

  @Column()
  merchant!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column()
  currency!: string;

  @Column({ name: 'settlement_currency' })
  settlementCurrency!: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ name: 'provider_reference', nullable: true })
  providerReference?: string;
}
