import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { GuardianEntity } from '@modules/guardian/entities/guardian.entity';
import { RecoveryApprovalStatus } from '@shared/enums';
import { RecoveryRequestEntity } from './recovery-request.entity';

@Entity('recovery_approvals')
@Unique(['recoveryRequestId', 'guardianId'])
export class RecoveryApprovalEntity extends BaseEntity {
  @Index()
  @Column({ name: 'recovery_request_id' })
  recoveryRequestId!: string;

  @ManyToOne(() => RecoveryRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recovery_request_id' })
  recoveryRequest!: RecoveryRequestEntity;

  @Column({ name: 'guardian_id' })
  guardianId!: string;

  @ManyToOne(() => GuardianEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guardian_id' })
  guardian!: GuardianEntity;

  @Column({
    type: 'enum',
    enum: RecoveryApprovalStatus,
    default: RecoveryApprovalStatus.PENDING,
  })
  status!: RecoveryApprovalStatus;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @Column({ type: 'text', nullable: true })
  signature?: string;
}
