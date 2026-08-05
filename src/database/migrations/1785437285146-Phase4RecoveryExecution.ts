import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4RecoveryExecution1785437285146 implements MigrationInterface {
  name = 'Phase4RecoveryExecution1785437285146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" ADD "guardian_threshold" integer`);
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD "recovery_hash" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "guardians" ADD "guardian_address" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "guardian_address"`);
    await queryRunner.query(`ALTER TABLE "recovery_requests" DROP COLUMN "recovery_hash"`);
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "guardian_threshold"`);
  }
}
