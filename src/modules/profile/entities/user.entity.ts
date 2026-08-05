import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserStatus } from '@shared/enums';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'turnkey_user_id', unique: true })
  turnkeyUserId!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;
}
