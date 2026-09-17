import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryClaimedAt1789700000000 implements MigrationInterface {
  name = 'RecoveryClaimedAt1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD "claimed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recovery_requests" DROP COLUMN "claimed_at"`);
  }
}
