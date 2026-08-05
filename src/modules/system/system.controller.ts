import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { PaginationQueryDto } from '@shared/dto';
import { SystemService } from './system.service';

@ApiTags('system')
@Controller({ path: 'system', version: '1' })
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health/providers')
  @ApiOperation({ summary: 'Aggregated health status across all provider integrations' })
  getProviderHealth() {
    return this.systemService.getProviderHealth();
  }

  @Get('audit-log')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List audit log entries for the authenticated user' })
  listAuditLog(@CurrentUser() user: IJwtPayload, @Query() query: PaginationQueryDto) {
    return this.systemService.listAuditForUser(user.sub, query);
  }
}
