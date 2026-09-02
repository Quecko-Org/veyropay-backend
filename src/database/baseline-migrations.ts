import dataSource from '../core/database/typeorm.datasource';

/**
 * Production was provisioned with schema already present while the TypeORM
 * `migrations` table stayed empty. Re-running historical migrations then fails
 * with "already exists". This script records migrations whose objects are
 * already in the database so `migration:run` only applies truly pending ones.
 */
const BASELINES: Array<{ timestamp: number; name: string; checkSql: string }> = [
  {
    timestamp: 1784535361804,
    name: 'Phase2Schema1784535361804',
    checkSql: `SELECT 1 FROM pg_type WHERE typname = 'webhook_events_provider_enum' LIMIT 1`,
  },
  {
    timestamp: 1785131623453,
    name: 'Phase3WalletOwnerAddress1785131623453',
    checkSql: `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'owner_address'
      LIMIT 1
    `,
  },
  {
    timestamp: 1785408367993,
    name: 'Phase4GuardianRecovery1785408367993',
    checkSql: `
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'guardians'
      LIMIT 1
    `,
  },
  {
    timestamp: 1785437285146,
    name: 'Phase4RecoveryExecution1785437285146',
    checkSql: `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'guardian_threshold'
      LIMIT 1
    `,
  },
  {
    timestamp: 1787227240460,
    name: 'Phase5GasSponsorshipCap1787227240460',
    checkSql: `
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'gas_sponsorships'
      LIMIT 1
    `,
  },
  {
    timestamp: 1788251520000,
    name: 'GuardianInvitationFields1788251520000',
    checkSql: `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'guardians' AND column_name = 'relationship'
      LIMIT 1
    `,
  },
];

async function ensureMigrationsTable(): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL,
      CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
    )
  `);
}

async function isRecorded(name: string): Promise<boolean> {
  const rows: unknown[] = await dataSource.query(`SELECT 1 FROM "migrations" WHERE "name" = $1 LIMIT 1`, [
    name,
  ]);
  return rows.length > 0;
}

async function schemaObjectExists(checkSql: string): Promise<boolean> {
  const rows: unknown[] = await dataSource.query(checkSql);
  return rows.length > 0;
}

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    await ensureMigrationsTable();

    let baselined = 0;
    for (const migration of BASELINES) {
      if (await isRecorded(migration.name)) {
        continue;
      }

      if (!(await schemaObjectExists(migration.checkSql))) {
        continue;
      }

      await dataSource.query(`INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2)`, [
        migration.timestamp,
        migration.name,
      ]);
      baselined += 1;
      // eslint-disable-next-line no-console
      console.log(`Baselined already-applied migration: ${migration.name}`);
    }

    // eslint-disable-next-line no-console
    console.log(
      baselined === 0
        ? 'Migration baseline: nothing to record'
        : `Migration baseline: recorded ${baselined} migration(s)`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Migration baseline failed', error);
  process.exit(1);
});
