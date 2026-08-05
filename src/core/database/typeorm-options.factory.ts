import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IDatabaseConfig } from '@core/config/database.config';

export function buildTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  const database = configService.get<IDatabaseConfig>('database') as IDatabaseConfig;

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.name,
    ssl: database.ssl ? { rejectUnauthorized: false } : false,
    logging: database.logging,
    // Schema changes must always go through reviewed migrations, never runtime sync.
    synchronize: false,
    migrationsRun: false,
    autoLoadEntities: true,
    entities: [
      __dirname + '/../../modules/**/entities/*.entity{.ts,.js}',
      __dirname + '/../../database/entities/*.entity{.ts,.js}',
    ],
    migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
  };
}
