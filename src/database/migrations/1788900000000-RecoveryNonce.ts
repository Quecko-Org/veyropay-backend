import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryNonce1788900000000 implements MigrationInterface {
  name = 'RecoveryNonce1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD "recovery_nonce" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recovery_requests" DROP COLUMN "recovery_nonce"`);
  }
}
