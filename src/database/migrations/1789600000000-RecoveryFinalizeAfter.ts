import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryFinalizeAfter1789600000000 implements MigrationInterface {
  name = 'RecoveryFinalizeAfter1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD "finalize_after" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recovery_requests" DROP COLUMN "finalize_after"`);
  }
}
