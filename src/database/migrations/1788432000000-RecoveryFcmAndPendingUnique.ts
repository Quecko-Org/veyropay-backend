import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryFcmAndPendingUnique1788432000000 implements MigrationInterface {
  name = 'RecoveryFcmAndPendingUnique1788432000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_sessions" ADD "fcm_token" character varying`);
    await queryRunner.query(
      `ALTER TABLE "device_sessions" ADD "fcm_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_recovery_requests_wallet_pending" ON "recovery_requests" ("wallet_id") WHERE "status" = 'pending' AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_recovery_requests_wallet_pending"`);
    await queryRunner.query(`ALTER TABLE "device_sessions" DROP COLUMN "fcm_updated_at"`);
    await queryRunner.query(`ALTER TABLE "device_sessions" DROP COLUMN "fcm_token"`);
  }
}
