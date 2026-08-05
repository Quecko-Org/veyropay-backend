import { Injectable } from '@nestjs/common';
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
}
