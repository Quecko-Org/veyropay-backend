import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import { TurnkeyHealthService } from '@integrations/turnkey/health.service';
import { SafeHealthService } from '@integrations/safe/health.service';
import { PimlicoHealthService } from '@integrations/pimlico/health.service';
import { OneinchHealthService } from '@integrations/oneinch/health.service';
import { LifiHealthService } from '@integrations/lifi/health.service';
import { SumsubHealthService } from '@integrations/sumsub/health.service';
import { RainHealthService } from '@integrations/rain/health.service';
import { BaanxHealthService } from '@integrations/baanx/health.service';
import { SendgridHealthService } from '@integrations/sendgrid/health.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ADMIN_CLEAR_DATABASE_PASSWORD } from './constants';

@Injectable()
export class SystemService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly turnkeyHealthService: TurnkeyHealthService,
    private readonly safeHealthService: SafeHealthService,
    private readonly pimlicoHealthService: PimlicoHealthService,
    private readonly oneinchHealthService: OneinchHealthService,
    private readonly lifiHealthService: LifiHealthService,
    private readonly sumsubHealthService: SumsubHealthService,
    private readonly rainHealthService: RainHealthService,
    private readonly baanxHealthService: BaanxHealthService,
    private readonly sendgridHealthService: SendgridHealthService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async recordAudit(
    action: string,
    userId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<AuditLogEntity> {
    const entry = this.auditLogRepository.create({ action, userId, metadata, ipAddress });
    return this.auditLogRepository.save(entry);
  }

  async listAuditForUser(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<AuditLogEntity>> {
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.auditLogRepository.findAndCountForUser(userId, skip, take);

    return new PaginatedResultDto(
      items,
      total,
      query.page ?? DEFAULT_PAGE,
      query.limit ?? DEFAULT_PAGE_SIZE,
    );
  }

  // Aggregates every provider integration's health check, per
  // docs/08_PROVIDER_INTEGRATIONS.md §14 ("Health endpoints are aggregated by the
  // System module"). This is business-level provider status, distinct from the
  // infra-level /health endpoint (core/health) which only checks the database.
  getProviderHealth(): Record<string, unknown> {
    const results = [
      this.turnkeyHealthService.check(),
      this.safeHealthService.check(),
      this.pimlicoHealthService.check(),
      this.oneinchHealthService.check(),
      this.lifiHealthService.check(),
      this.sumsubHealthService.check(),
      this.rainHealthService.check(),
      this.baanxHealthService.check(),
      this.sendgridHealthService.check(),
    ];

    return Object.assign({}, ...results) as Record<string, unknown>;
  }

  // Temporary admin wipe - truncates every app entity table. Does not touch the
  // TypeORM migrations table. Replace with proper admin auth later.
  async clearDatabase(password: string): Promise<{ cleared: true; tables: string[] }> {
    if (password !== ADMIN_CLEAR_DATABASE_PASSWORD) {
      throw new ForbiddenException('Invalid admin password');
    }

    const tables = this.dataSource.entityMetadatas.map((meta) => meta.tableName);
    if (tables.length === 0) {
      return { cleared: true, tables: [] };
    }

    const quoted = tables.map((name) => `"${name}"`).join(', ');
    await this.dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

    return { cleared: true, tables };
  }
}
