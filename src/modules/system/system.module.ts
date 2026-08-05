import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsModule } from '@integrations/integrations.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity]), IntegrationsModule],
  controllers: [SystemController],
  providers: [SystemService, AuditLogRepository],
  exports: [SystemService],
})
export class SystemModule {}
