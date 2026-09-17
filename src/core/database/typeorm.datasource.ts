import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';

// Docker/CI passes env via --env-file; only load a file when vars are not already set.
if (!process.env.DATABASE_HOST) {
  const envPath = process.env.ENV_FILE ?? '.env';
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
}

// Standalone DataSource used exclusively by the TypeORM CLI for generating,
// running, and reverting migrations outside of the Nest application context.
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: process.env.DATABASE_LOGGING === 'true',
  synchronize: false,
  entities: [
    __dirname + '/../../modules/**/entities/*.entity{.ts,.js}',
    __dirname + '/../../database/entities/*.entity{.ts,.js}',
  ],
  migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
});
