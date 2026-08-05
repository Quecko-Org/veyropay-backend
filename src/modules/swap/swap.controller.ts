import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { SwapService } from './swap.service';
import { PreviewSwapDto } from './dto/preview-swap.dto';
import { ExecuteSwapDto } from './dto/execute-swap.dto';

@ApiTags('swap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'swap', version: '1' })
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Preview a swap quote (same-chain via 1inch, cross-chain via LiFi)' })
  preview(@Body() dto: PreviewSwapDto) {
    return this.swapService.previewQuote(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a signed swap for broadcast' })
  execute(@CurrentUser() user: IJwtPayload, @Body() dto: ExecuteSwapDto) {
    return this.swapService.execute(user.sub, dto);
  }
}
