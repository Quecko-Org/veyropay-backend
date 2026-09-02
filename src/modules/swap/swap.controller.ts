import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { SwapService } from './swap.service';
import { PreviewSwapDto } from './dto/preview-swap.dto';
import { ExecuteSwapDto } from './dto/execute-swap.dto';
import { CheckSwapApprovalDto } from './dto/check-swap-approval.dto';

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
  


// ...inside the class, after preview():
@Post('approval')
@ApiOperation({
  summary:
    'Check whether the source token needs an approve() before this swap can execute ' +
    '- call before /prepare whenever the swap source is a token, not native ETH',
})
checkApproval(@Body() dto: CheckSwapApprovalDto) {
  return this.swapService.checkApproval(dto);
}
}
