import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4GuardianRecovery1785408367993 implements MigrationInterface {
  name = 'Phase4GuardianRecovery1785408367993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."recovery_requests_status_enum" AS ENUM('pending', 'approved', 'executed', 'rejected', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recovery_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "wallet_id" uuid NOT NULL, "requested_by_email" character varying NOT NULL, "new_owner_address" character varying NOT NULL, "required_approvals" integer NOT NULL, "status" "public"."recovery_requests_status_enum" NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP WITH TIME ZONE, "executed_at" TIMESTAMP WITH TIME ZONE, "execution_tx_hash" character varying, "failure_reason" character varying, CONSTRAINT "PK_3b0575352da017f21b7819e9089" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_359c87fb0cf298bed0230beb92" ON "recovery_requests" ("wallet_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardians_status_enum" AS ENUM('invited', 'active', 'removed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guardians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "wallet_id" uuid NOT NULL, "guardian_email" character varying NOT NULL, "guardian_name" character varying, "guardian_user_id" uuid, "status" "public"."guardians_status_enum" NOT NULL DEFAULT 'invited', "invitation_token" character varying NOT NULL, "invited_at" TIMESTAMP WITH TIME ZONE NOT NULL, "verified_at" TIMESTAMP WITH TIME ZONE, "removed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_c1398ca651a07408e34e0e020d9" UNIQUE ("invitation_token"), CONSTRAINT "PK_3dcf02f3dc96a2c017106f280be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0142c69b2b1a1b9da764514ea" ON "guardians" ("wallet_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c1398ca651a07408e34e0e020d" ON "guardians" ("invitation_token") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recovery_approvals_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recovery_approvals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "recovery_request_id" uuid NOT NULL, "guardian_id" uuid NOT NULL, "status" "public"."recovery_approvals_status_enum" NOT NULL DEFAULT 'pending', "decided_at" TIMESTAMP WITH TIME ZONE, "signature" text, CONSTRAINT "PK_2566f9bebce865f3ce94ee4a4f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_532b2bf79f2568c26ccee95eeb" ON "recovery_approvals" ("recovery_request_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3371e851bee8e7df2f7d1c1346" ON "recovery_approvals" ("recovery_request_id", "guardian_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" ADD CONSTRAINT "FK_359c87fb0cf298bed0230beb926" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD CONSTRAINT "FK_c0142c69b2b1a1b9da764514ea0" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recovery_approvals" ADD CONSTRAINT "FK_532b2bf79f2568c26ccee95eeb2" FOREIGN KEY ("recovery_request_id") REFERENCES "recovery_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recovery_approvals" ADD CONSTRAINT "FK_612500b61d2b4f009dcc20ce338" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recovery_approvals" DROP CONSTRAINT "FK_612500b61d2b4f009dcc20ce338"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recovery_approvals" DROP CONSTRAINT "FK_532b2bf79f2568c26ccee95eeb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" DROP CONSTRAINT "FK_c0142c69b2b1a1b9da764514ea0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recovery_requests" DROP CONSTRAINT "FK_359c87fb0cf298bed0230beb926"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_3371e851bee8e7df2f7d1c1346"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_532b2bf79f2568c26ccee95eeb"`);
    await queryRunner.query(`DROP TABLE "recovery_approvals"`);
    await queryRunner.query(`DROP TYPE "public"."recovery_approvals_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c1398ca651a07408e34e0e020d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0142c69b2b1a1b9da764514ea"`);
    await queryRunner.query(`DROP TABLE "guardians"`);
    await queryRunner.query(`DROP TYPE "public"."guardians_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_359c87fb0cf298bed0230beb92"`);
    await queryRunner.query(`DROP TABLE "recovery_requests"`);
    await queryRunner.query(`DROP TYPE "public"."recovery_requests_status_enum"`);
  }
}
