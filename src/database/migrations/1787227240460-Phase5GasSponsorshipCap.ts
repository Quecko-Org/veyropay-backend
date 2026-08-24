import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5GasSponsorshipCap1787227240460 implements MigrationInterface {
  name = 'Phase5GasSponsorshipCap1787227240460';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "gas_sponsorships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "amount_wei" numeric(78,0) NOT NULL, "chain_id" integer NOT NULL, CONSTRAINT "PK_8294272d5c3f6a2965c3a7d3a96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7947d217ce5d0ea1db9a9c523e" ON "gas_sponsorships" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_7947d217ce5d0ea1db9a9c523e"`);
    await queryRunner.query(`DROP TABLE "gas_sponsorships"`);
  }
}