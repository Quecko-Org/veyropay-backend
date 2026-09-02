import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactionFailureReason1788353011229 implements MigrationInterface {
    name = 'AddTransactionFailureReason1788353011229'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c1398ca651a07408e34e0e020d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_guardians_guardian_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_guardians_wallet_email_open"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "failure_reason" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_4eb325684ffcdee301eeebfd19" ON "guardians" ("guardian_user_id") `);
        await queryRunner.query(`ALTER TABLE "guardians" ADD CONSTRAINT "FK_4eb325684ffcdee301eeebfd19a" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "guardians" DROP CONSTRAINT "FK_4eb325684ffcdee301eeebfd19a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4eb325684ffcdee301eeebfd19"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "failure_reason"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_guardians_wallet_email_open" ON "guardians" ("wallet_id", "guardian_email") WHERE ((status = ANY (ARRAY['invited'::guardians_status_enum, 'active'::guardians_status_enum])) AND (deleted_at IS NULL))`);
        await queryRunner.query(`CREATE INDEX "IDX_guardians_guardian_user_id" ON "guardians" ("guardian_user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c1398ca651a07408e34e0e020d" ON "guardians" ("invitation_token") `);
    }

}
