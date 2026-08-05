import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { PaginationQueryDto } from '@shared/dto';
import { RecoveryRequestService } from '../services/recovery-request.service';
import { CreateRecoveryRequestDto } from '../dto/create-recovery-request.dto';
import { SubmitApprovalDto } from '../dto/submit-approval.dto';

@ApiTags('guardian-recovery')
@Controller({ path: 'guardian-recovery/recovery-requests', version: '1' })
export class RecoveryRequestController {
  constructor(private readonly recoveryRequestService: RecoveryRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Initiate guardian wallet recovery',
    description:
      'Unauthenticated - the requester has lost session access. Identifies the account by email.',
  })
  async create(@Body() dto: CreateRecoveryRequestDto) {
    await this.recoveryRequestService.createRequest(dto);
    // Same response whether or not the email matches an account - avoids leaking
    // account existence to an unauthenticated caller.
    return {
      message: 'If an account with this email exists, a recovery request has been created.',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get recovery request status (public - the ID itself is the credential)',
  })
  getById(@Param('id') id: string) {
    return this.recoveryRequestService.getById(id);
  }

  @Post(':id/approve/:token')
  @ApiOperation({
    summary: 'Guardian approves a recovery request (authenticated by invitation token)',
  })
  approve(@Param('id') id: string, @Param('token') token: string, @Body() dto: SubmitApprovalDto) {
    return this.recoveryRequestService.submitApproval(id, token, 'approved', dto);
  }

  @Post(':id/reject/:token')
  @ApiOperation({
    summary: 'Guardian rejects a recovery request (authenticated by invitation token)',
  })
  reject(@Param('id') id: string, @Param('token') token: string, @Body() dto: SubmitApprovalDto) {
    return this.recoveryRequestService.submitApproval(id, token, 'rejected', dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List recovery request history for the authenticated user wallet' })
  history(@CurrentUser() user: IJwtPayload, @Query() query: PaginationQueryDto) {
    return this.recoveryRequestService.listHistoryForWallet(user.sub, query);
  }

  @Post(':id/execute')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Execute an approved recovery request',
    description:
      'Relays the collected guardian signatures on-chain via the SocialRecoveryModule. ' +
      'Requires the module to already be enabled on this wallet (see GET ' +
      '/guardian-recovery/guardians/module-setup) and at least `requiredApprovals` guardians ' +
      'with a registered on-chain address and signature. See ' +
      'docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.',
  })
  execute(@CurrentUser() user: IJwtPayload, @Param('id') id: string) {
    return this.recoveryRequestService.executeRecovery(user.sub, id);
  }
}
