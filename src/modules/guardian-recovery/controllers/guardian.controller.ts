import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { GuardianService } from '../services/guardian.service';
import { AddGuardianDto } from '../dto/add-guardian.dto';
import { AcceptGuardianInvitationDto } from '../dto/accept-guardian-invitation.dto';
import { SetGuardianThresholdDto } from '../dto/set-guardian-threshold.dto';

@ApiTags('guardian-recovery')
@Controller({ path: 'guardian-recovery/guardians', version: '1' })
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Invite a recovery guardian for the authenticated user wallet' })
  add(@CurrentUser() user: IJwtPayload, @Body() dto: AddGuardianDto) {
    return this.guardianService.addGuardian(user.sub, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List guardians for the authenticated user wallet' })
  list(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.listGuardians(user.sub);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a guardian' })
  remove(@CurrentUser() user: IJwtPayload, @Param('id') id: string) {
    return this.guardianService.removeGuardian(user.sub, id);
  }

  @Post('accept/:token')
  @ApiOperation({
    summary: 'Accept a guardian invitation (public, authenticated by the invitation token)',
    description:
      'Optionally set the guardian own on-chain address - required before this guardian can ' +
      'be registered with the SocialRecoveryModule and produce an execution-eligible approval.',
  })
  accept(@Param('token') token: string, @Body() dto: AcceptGuardianInvitationDto) {
    return this.guardianService.acceptInvitation(token, dto);
  }

  @Patch('threshold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set the wallet configurable N-of-M guardian recovery threshold',
  })
  setThreshold(@CurrentUser() user: IJwtPayload, @Body() dto: SetGuardianThresholdDto) {
    return this.guardianService.setGuardianThreshold(user.sub, dto);
  }

  @Get('module-setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Unsigned calldata to enable the SocialRecoveryModule and register guardians',
    description:
      'Additive, opt-in - does not affect the Safe deployment/address prediction from Phase 3. ' +
      'Each returned step must be signed (via Turnkey) and submitted through the existing ' +
      'POST /wallet/prepare + submit flow, one UserOperation per step.',
  })
  getModuleSetup(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.getRecoveryModuleSetupCalldata(user.sub);
  }
}
