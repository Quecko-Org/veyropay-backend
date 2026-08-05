import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3WalletOwnerAddress1785131623453 implements MigrationInterface {
  name = 'Phase3WalletOwnerAddress1785131623453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" ADD "owner_address" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "owner_address"`);
  }
}
