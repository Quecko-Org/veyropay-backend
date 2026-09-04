import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { DeviceSessionStatus } from '@shared/enums';

@Entity('device_sessions')
export class DeviceSessionEntity extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'device_name', nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  platform?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'last_seen', type: 'timestamptz' })
  lastSeen!: Date;

  @Column({ type: 'enum', enum: DeviceSessionStatus, default: DeviceSessionStatus.ACTIVE })
  status!: DeviceSessionStatus;

  @Column({ name: 'fcm_token', nullable: true })
  fcmToken?: string;

  @Column({ name: 'fcm_updated_at', type: 'timestamptz', nullable: true })
  fcmUpdatedAt?: Date;
}
