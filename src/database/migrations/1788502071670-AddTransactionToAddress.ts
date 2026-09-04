import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactionToAddress1788502071670 implements MigrationInterface {
    name = 'AddTransactionToAddress1788502071670'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ADD "to_address" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "to_address"`);
    }

}
