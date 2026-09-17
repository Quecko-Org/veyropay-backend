import { DataSource } from 'typeorm';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Creates DATABASE_NAME on the Postgres server when missing (e.g. fresh prod deploy).
 * Connects to the maintenance DB `postgres` — the role must have CREATEDB or be superuser.
 */
export async function ensureDatabaseExists(): Promise<void> {
  const database = requireEnv('DATABASE_NAME');

  const admin = new DataSource({
    type: 'postgres',
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: requireEnv('DATABASE_USERNAME'),
    password: requireEnv('DATABASE_PASSWORD'),
    database: 'postgres',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await admin.initialize();

  try {
    const rows: Array<{ exists: boolean }> = await admin.query(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"`,
      [database],
    );

    if (rows[0]?.exists) {
      console.log(`Database "${database}" already exists`);
      return;
    }

    const escaped = database.replace(/"/g, '""');
    await admin.query(`CREATE DATABASE "${escaped}"`);
    console.log(`Created database "${database}"`);
  } finally {
    await admin.destroy();
  }
}

if (require.main === module) {
  ensureDatabaseExists().catch((error: unknown) => {
    console.error('Ensure database failed', error);
    process.exit(1);
  });
}
