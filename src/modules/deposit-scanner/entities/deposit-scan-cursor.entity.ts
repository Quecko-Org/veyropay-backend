import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@database/base.entity';

// Tracks the last block number this project has fully scanned for incoming
// deposits, per chain - so each run picks up exactly where the last one left off
// instead of re-scanning or skipping blocks.
@Entity('deposit_scan_cursors')
export class DepositScanCursorEntity extends BaseEntity {
  @Column({ unique: true })
  chain!: string;

  @Column({ name: 'last_scanned_block', type: 'bigint' })
  lastScannedBlock!: string;
}