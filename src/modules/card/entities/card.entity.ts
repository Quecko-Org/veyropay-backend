import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { CardProvider, CardStatus } from '@shared/enums';

@Entity('cards')
export class CardEntity extends BaseEntity {
  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: CardProvider })
  provider!: CardProvider;

  @Column({ name: 'card_reference' })
  cardReference!: string;

  @Column({ type: 'enum', enum: CardStatus, default: CardStatus.PENDING })
  status!: CardStatus;

  @Column({ name: 'spend_limit', type: 'numeric', precision: 18, scale: 2, nullable: true })
  spendLimit?: string;
}
