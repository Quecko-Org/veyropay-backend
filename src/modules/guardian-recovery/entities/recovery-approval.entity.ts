import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { RecoveryRequestEntity } from './recovery-request.entity';
import { GuardianEntity } from './guardian.entity';
import { RecoveryApprovalStatus } from '@shared/enums';

@Entity('recovery_approvals')
@Index(['recoveryRequestId', 'guardianId'], { unique: true })
export class RecoveryApprovalEntity extends BaseEntity {
  @Index()
  @Column({ name: 'recovery_request_id', type: 'uuid' })
  recoveryRequestId!: string;

  @ManyToOne(() => RecoveryRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recovery_request_id' })
  recoveryRequest!: RecoveryRequestEntity;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardianId!: string;

  @ManyToOne(() => GuardianEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guardian_id' })
  guardian!: GuardianEntity;

  @Column({ type: 'enum', enum: RecoveryApprovalStatus, default: RecoveryApprovalStatus.PENDING })
  status!: RecoveryApprovalStatus;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date;

  // Off-chain attestation of the guardian's approval decision. Format (signature scheme,
  // what payload it covers) is intentionally unspecified pending the on-chain execution
  // design - see docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
  @Column({ type: 'text', nullable: true })
  signature?: string;
}
