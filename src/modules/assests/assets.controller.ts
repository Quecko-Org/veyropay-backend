import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';

// Public, unauthenticated - this is static reference data (token contract addresses
// per chain), not user-specific, so clients can populate an asset picker before login.
@ApiTags('assets')
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List supported assets, optionally filtered by chain' })
  list(@Query() query: ListAssetsQueryDto) {
    return this.assetsService.list(query.chainId);
  }
}
