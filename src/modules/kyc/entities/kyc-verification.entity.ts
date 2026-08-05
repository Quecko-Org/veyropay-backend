import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { KycStatus } from '@shared/enums';

@Entity('kyc_verifications')
export class KycVerificationEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ default: 'sumsub' })
  provider!: string;

  @Index()
  @Column({ name: 'applicant_id', nullable: true })
  applicantId?: string;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NOT_STARTED,
  })
  verificationStatus!: KycStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
