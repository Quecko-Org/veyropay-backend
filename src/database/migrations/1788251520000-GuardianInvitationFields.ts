import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuardianInvitationFields1788251520000 implements MigrationInterface {
  name = 'GuardianInvitationFields1788251520000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."guardians_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardians_relationship_enum" AS ENUM('family', 'partner', 'friend', 'colleague')`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD "relationship" "public"."guardians_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD "can_approve_recovery" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD "can_move_funds" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD "can_see_balance" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD "can_be_removed" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_guardians_guardian_user_id" ON "guardians" ("guardian_user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_guardians_wallet_email_open" ON "guardians" ("wallet_id", "guardian_email") WHERE "status" IN ('invited', 'active') AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_guardians_wallet_email_open"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_guardians_guardian_user_id"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "can_be_removed"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "can_see_balance"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "can_move_funds"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "can_approve_recovery"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP COLUMN "relationship"`);
    await queryRunner.query(`DROP TYPE "public"."guardians_relationship_enum"`);
  }
}
