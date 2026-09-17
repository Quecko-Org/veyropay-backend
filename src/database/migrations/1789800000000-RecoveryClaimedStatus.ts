import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryClaimedStatus1789800000000 implements MigrationInterface {
  name = 'RecoveryClaimedStatus1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL requires the new enum value to be committed before it can be used in UPDATE.
    await queryRunner.commitTransaction();
    await queryRunner.query(
      `ALTER TYPE "public"."recovery_requests_status_enum" ADD VALUE 'claimed'`,
    );
    await queryRunner.startTransaction();
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD "confirm_tx_hash" character varying`,
    );
    await queryRunner.query(`
      UPDATE "recovery_requests"
      SET "status" = 'claimed'
      WHERE "claimed_at" IS NOT NULL AND "status" = 'executed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recovery_requests" DROP COLUMN "confirm_tx_hash"`);
    await queryRunner.query(`
      UPDATE "recovery_requests"
      SET "status" = 'executed'
      WHERE "status" = 'claimed'
    `);
    // PostgreSQL does not support removing enum values without recreating the type.
  }
}
