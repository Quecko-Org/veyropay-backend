import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { TransferService } from './transfer.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';

@ApiTags('transfer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'transfer', version: '1' })
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a signed transfer for broadcast' })
  send(@CurrentUser() user: IJwtPayload, @Body() dto: InitiateTransferDto) {
    return this.transferService.send(user.sub, dto);
  }
}
