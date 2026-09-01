import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { PaginationQueryDto } from '@shared/dto';
import { WalletService } from './wallet.service';
import { PrepareUserOperationDto } from './dto/prepare-user-operation.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}
 
  @Get()
  @ApiOperation({ summary: 'Get the authenticated user wallet' })
  getWallet(@CurrentUser() user: IJwtPayload) {
    return this.walletService.getByUserId(user.sub);
  }
 
  @Post('provision')
  @ApiOperation({ summary: 'Provision the on-chain smart account for the wallet' })
  provision(@CurrentUser() user: IJwtPayload) {
    return this.walletService.requestSmartAccountProvisioning(user.sub);
  }
 
  @Post('user-operations/prepare')
  @ApiOperation({ summary: 'Prepare an unsigned UserOperation for the client to sign' })
  prepareUserOperation(@CurrentUser() user: IJwtPayload, @Body() dto: PrepareUserOperationDto) {
    return this.walletService.prepareUserOperation(user.sub, dto);
  }
 
  @Get('transactions')
  @ApiOperation({ summary: 'List transactions for the authenticated user wallet' })
  listTransactions(@CurrentUser() user: IJwtPayload, @Query() query: PaginationQueryDto) {
    return this.walletService.listTransactions(user.sub, query);
  }
}
