import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { RecoveryService } from './recovery.service';
import { InitEmailRecoveryDto } from './dto/init-email-recovery.dto';
import { CompleteEmailRecoveryDto } from './dto/complete-email-recovery.dto';

@ApiTags('recovery')
@Controller({ path: 'recovery', version: '1' })
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List device sessions for security review' })
  listSessions(@CurrentUser() user: IJwtPayload) {
    return this.recoveryService.listSessions(user.sub);
  }

  @Post('sessions/revoke-others')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke every device session except the current one' })
  revokeOtherSessions(@CurrentUser() user: IJwtPayload) {
    return this.recoveryService.revokeOtherSessions(user.sub, user.sid);
  }

  @Post('email/init')
  @ApiOperation({
    summary: 'Start Turnkey email identity recovery',
    description: 'Unauthenticated - the requester has lost session access.',
  })
  async initEmailRecovery(@Body() dto: InitEmailRecoveryDto) {
    const result = await this.recoveryService.initiateEmailRecovery(dto);
    // Deliberately the same shape of response whether or not the email matched an
    // account would be ideal, but the client genuinely needs organizationId/userId to
    // proceed - see recovery.service.ts for the tradeoff this makes.
    return (
      result ?? { message: 'If an account with this email exists, a recovery email has been sent.' }
    );
  }

  @Post('email/complete')
  @ApiOperation({
    summary: 'Complete Turnkey email identity recovery (registers a new passkey)',
    description:
      'Relays a client-stamped Turnkey activity - the backend cannot produce this stamp itself.',
  })
  completeEmailRecovery(@Body() dto: CompleteEmailRecoveryDto) {
    return this.recoveryService.completeEmailRecovery(dto);
  }
}
