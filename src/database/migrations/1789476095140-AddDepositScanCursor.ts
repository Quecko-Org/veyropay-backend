import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepositScanCursor1789476095140 implements MigrationInterface {
    name = 'AddDepositScanCursor1789476095140'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_recovery_requests_wallet_pending"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3371e851bee8e7df2f7d1c1346"`);
        await queryRunner.query(`CREATE TABLE "deposit_scan_cursors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "chain" character varying NOT NULL, "last_scanned_block" bigint NOT NULL, CONSTRAINT "UQ_f61f39460037496a7a991b70a69" UNIQUE ("chain"), CONSTRAINT "PK_55899b8fbf737e4ad31852648c6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "device_sessions" DROP COLUMN "fcm_token"`);
        await queryRunner.query(`ALTER TABLE "device_sessions" DROP COLUMN "fcm_updated_at"`);
        await queryRunner.query(`ALTER TYPE "public"."webhook_events_provider_enum" RENAME TO "webhook_events_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."webhook_events_provider_enum" AS ENUM('sumsub', 'rain', 'baanx')`);
        await queryRunner.query(`ALTER TABLE "webhook_events" ALTER COLUMN "provider" TYPE "public"."webhook_events_provider_enum" USING "provider"::"text"::"public"."webhook_events_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_events_provider_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."webhook_events_provider_enum_old" AS ENUM('sumsub', 'rain', 'baanx', 'alchemy')`);
        await queryRunner.query(`ALTER TABLE "webhook_events" ALTER COLUMN "provider" TYPE "public"."webhook_events_provider_enum_old" USING "provider"::"text"::"public"."webhook_events_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_events_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."webhook_events_provider_enum_old" RENAME TO "webhook_events_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "device_sessions" ADD "fcm_updated_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "device_sessions" ADD "fcm_token" character varying`);
        await queryRunner.query(`DROP TABLE "deposit_scan_cursors"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3371e851bee8e7df2f7d1c1346" ON "recovery_approvals" ("recovery_request_id", "guardian_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_recovery_requests_wallet_pending" ON "recovery_requests" ("wallet_id") WHERE ((status = 'pending'::recovery_requests_status_enum) AND (deleted_at IS NULL))`);
    }

}
