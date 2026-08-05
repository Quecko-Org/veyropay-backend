import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { KycService } from './kyc.service';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kyc', version: '1' })
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Start (or resume) Sumsub identity verification' })
  initiate(@CurrentUser() user: IJwtPayload) {
    return this.kycService.initiate(user.sub);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get the current KYC verification status' })
  getStatus(@CurrentUser() user: IJwtPayload) {
    return this.kycService.getStatus(user.sub);
  }
}
