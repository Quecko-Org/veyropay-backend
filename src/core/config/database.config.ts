import { registerAs } from '@nestjs/config';

export interface IDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  logging: boolean;
  synchronize: boolean;
}

export default registerAs('database', (): IDatabaseConfig => ({
  host: process.env.DATABASE_HOST as string,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME as string,
  password: process.env.DATABASE_PASSWORD as string,
  name: process.env.DATABASE_NAME as string,
  ssl: process.env.DATABASE_SSL === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
}));
