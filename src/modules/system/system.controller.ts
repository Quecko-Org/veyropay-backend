import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { PaginationQueryDto } from '@shared/dto';
import { SystemService } from './system.service';
import { ClearDatabaseDto } from './dto/clear-database.dto';

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

  @Post('admin/clear-database')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN / TEMP] Wipe all application database tables',
    description:
      'Password-gated truncate of every entity table (CASCADE). Temporary helper until ' +
      'a real admin route exists. Does not drop schema or the migrations table.',
  })
  clearDatabase(@Body() dto: ClearDatabaseDto) {
    return this.systemService.clearDatabase(dto.password);
  }
}
