import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2Schema1784535361804 implements MigrationInterface {
  name = 'Phase2Schema1784535361804';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."webhook_events_provider_enum" AS ENUM('sumsub', 'rain', 'baanx')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."webhook_events_status_enum" AS ENUM('received', 'processed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "provider" "public"."webhook_events_provider_enum" NOT NULL, "event_type" character varying NOT NULL, "payload" jsonb NOT NULL, "status" "public"."webhook_events_status_enum" NOT NULL DEFAULT 'received', CONSTRAINT "PK_4cba37e6a0acb5e1fc49c34ebfd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d9e28001180e406c26ca7bec1" ON "webhook_events" ("provider") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('deposit', 'withdrawal', 'transfer', 'swap', 'card_payment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'confirmed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "wallet_id" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "provider" character varying, "chain" character varying NOT NULL, "asset" character varying NOT NULL, "amount" numeric(36,18) NOT NULL, "fee" numeric(36,18) NOT NULL DEFAULT '0', "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "tx_hash" character varying, "provider_reference" character varying, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b171330be0cb621f8d73b87a9" ON "transactions" ("wallet_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'suspended', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "turnkey_user_id" character varying NOT NULL, "email" character varying, "phone" character varying, "display_name" character varying, "avatar" character varying, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_ac17a01f4aeff10f42bb31f8b76" UNIQUE ("turnkey_user_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ac17a01f4aeff10f42bb31f8b7" ON "users" ("turnkey_user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallets_status_enum" AS ENUM('pending_provider', 'active', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "smart_account_address" character varying, "chain_id" integer NOT NULL, "status" "public"."wallets_status_enum" NOT NULL DEFAULT 'pending_provider', CONSTRAINT "UQ_92558c08091598f7a4439586cda" UNIQUE ("user_id"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_92558c08091598f7a4439586cd" ON "wallets" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid, "action" character varying NOT NULL, "metadata" jsonb, "ip_address" character varying, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('auth', 'transfer', 'swap', 'card', 'kyc', 'recovery', 'security')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "read" boolean NOT NULL DEFAULT false, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "provider_references" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "provider" character varying NOT NULL, "reference_id" character varying NOT NULL, CONSTRAINT "PK_e0bde5c35666c68f01e2624f1e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1ace51a18cfe638c70a025dbc9" ON "provider_references" ("user_id", "provider") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kyc_verifications_verification_status_enum" AS ENUM('not_started', 'pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kyc_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "provider" character varying NOT NULL DEFAULT 'sumsub', "applicant_id" character varying, "verification_status" "public"."kyc_verifications_verification_status_enum" NOT NULL DEFAULT 'not_started', "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_1e23c7821d740b4881f773c39aa" UNIQUE ("user_id"), CONSTRAINT "PK_57b7c6b141dd225ce5dc95d7fb0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e23c7821d740b4881f773c39a" ON "kyc_verifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a41091ad1e3c4b9aea737ae45" ON "kyc_verifications" ("applicant_id") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."cards_provider_enum" AS ENUM('rain', 'baanx')`);
    await queryRunner.query(
      `CREATE TYPE "public"."cards_status_enum" AS ENUM('pending', 'active', 'frozen', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "provider" "public"."cards_provider_enum" NOT NULL, "card_reference" character varying NOT NULL, "status" "public"."cards_status_enum" NOT NULL DEFAULT 'pending', "spend_limit" numeric(18,2), CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c54b595af68cc3870b651e11c" ON "cards" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_transactions_status_enum" AS ENUM('pending', 'confirmed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "card_id" uuid NOT NULL, "merchant" character varying NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "settlement_currency" character varying NOT NULL, "status" "public"."card_transactions_status_enum" NOT NULL DEFAULT 'pending', "provider_reference" character varying, CONSTRAINT "PK_b8134a1a069b742d44cfffe7418" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0d59a43369bb81a930539e087" ON "card_transactions" ("card_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."device_sessions_status_enum" AS ENUM('active', 'revoked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "device_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "device_name" character varying, "platform" character varying, "ip_address" character varying, "last_seen" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."device_sessions_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_94d0c25305680904fc03285a38e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_references" ADD CONSTRAINT "FK_5e15a7687a24fa70dd87ef50f3d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" ADD CONSTRAINT "FK_1e23c7821d740b4881f773c39aa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD CONSTRAINT "FK_1c54b595af68cc3870b651e11c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_transactions" ADD CONSTRAINT "FK_c0d59a43369bb81a930539e087b" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_sessions" ADD CONSTRAINT "FK_25bdb865453f3684db291e1436f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_sessions" DROP CONSTRAINT "FK_25bdb865453f3684db291e1436f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_transactions" DROP CONSTRAINT "FK_c0d59a43369bb81a930539e087b"`,
    );
    await queryRunner.query(`ALTER TABLE "cards" DROP CONSTRAINT "FK_1c54b595af68cc3870b651e11c9"`);
    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" DROP CONSTRAINT "FK_1e23c7821d740b4881f773c39aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_references" DROP CONSTRAINT "FK_5e15a7687a24fa70dd87ef50f3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`,
    );
    await queryRunner.query(`DROP TABLE "device_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."device_sessions_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0d59a43369bb81a930539e087"`);
    await queryRunner.query(`DROP TABLE "card_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."card_transactions_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1c54b595af68cc3870b651e11c"`);
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP TYPE "public"."cards_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."cards_provider_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0a41091ad1e3c4b9aea737ae45"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1e23c7821d740b4881f773c39a"`);
    await queryRunner.query(`DROP TABLE "kyc_verifications"`);
    await queryRunner.query(`DROP TYPE "public"."kyc_verifications_verification_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1ace51a18cfe638c70a025dbc9"`);
    await queryRunner.query(`DROP TABLE "provider_references"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_92558c08091598f7a4439586cd"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TYPE "public"."wallets_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ac17a01f4aeff10f42bb31f8b7"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0b171330be0cb621f8d73b87a9"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2d9e28001180e406c26ca7bec1"`);
    await queryRunner.query(`DROP TABLE "webhook_events"`);
    await queryRunner.query(`DROP TYPE "public"."webhook_events_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."webhook_events_provider_enum"`);
  }
}
