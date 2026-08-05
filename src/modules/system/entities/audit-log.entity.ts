import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@database/base.entity';

// Audit records are immutable - only ever inserted, never updated.
@Entity('audit_logs')
export class AuditLogEntity extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column()
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;
}
