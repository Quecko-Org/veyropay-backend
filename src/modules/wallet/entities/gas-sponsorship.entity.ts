import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@database/base.entity';

// One row per sponsored UserOperation, recorded at prepare-time (when Pimlico
// grants sponsorship) - the running total against a user's daily/monthly cap.
// Complements, doesn't replace, Pimlico's own Sponsorship Policy - that enforces
// the cap server-side regardless; this table exists so the app itself can check/
// display usage without depending on Pimlico's dashboard/reporting API, and gives
// an authoritative cap this backend controls independently.
@Entity('gas_sponsorships')
export class GasSponsorshipEntity extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // Wei, as a string - numeric(78,0) comfortably covers any realistic gas cost
  // without floating-point precision loss.
  @Column({ name: 'amount_wei', type: 'numeric', precision: 78, scale: 0 })
  amountWei!: string;

  @Column({ name: 'chain_id' })
  chainId!: number;
}