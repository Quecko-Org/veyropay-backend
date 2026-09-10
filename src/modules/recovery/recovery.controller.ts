import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { RECOVERY_PUBLIC_THROTTLE_LIMIT, RECOVERY_PUBLIC_THROTTLE_TTL_MS } from './constants';
import {
  CreateRecoveryRequestDto,
  LookupRecoveryByAddressDto,
  LookupRecoveryByEmailDto,
  ApproveRecoveryDto,
} from './dto';
import { RecoveryService } from './recovery.service';

@ApiTags('recovery')
@Controller({ path: 'recovery', version: '1' })
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get('lookup')
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({ summary: 'Find a recoverable wallet by owner email' })
  lookupByEmail(@Query() query: LookupRecoveryByEmailDto) {
    return this.recoveryService.lookupByEmail(query.email);
  }

  @Get('lookupByAddress')
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({ summary: 'Find a recoverable wallet by smart account address' })
  lookupByAddress(@Query() query: LookupRecoveryByAddressDto) {
    return this.recoveryService.lookupByAddress(query.address);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Start on-chain guardian recovery with a new Turnkey signer',
    description:
      'Computes SocialRecoveryModule recoveryHash for guardians to EIP-712 sign. ' +
      'Guardians must already be registered on-chain. Approvals require signatures; ' +
      'threshold triggers relayer multiConfirmRecovery (DB alone cannot move the Safe).',
  })
  createRequest(@Body() dto: CreateRecoveryRequestDto) {
    return this.recoveryService.createRequest(dto);
  }

  @Get('requests/:id')
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({ summary: 'Poll recovery request status, hash, and per-guardian approvals' })
  getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.getRequest(id);
  }

  @Get('incoming')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List recovery approvals assigned to the authenticated guardian' })
  listIncoming(@CurrentUser() user: IJwtPayload) {
    return this.recoveryService.listIncoming(user.sub);
  }

  @Patch('approvals/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Approve recovery with an on-chain guardian signature',
    description:
      'Body.signature must recover to this guardian\'s Turnkey EOA over recoveryHash. ' +
      'When the threshold is met the backend relays multiConfirmRecovery.',
  })
  approve(
    @CurrentUser() user: IJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRecoveryDto,
  ) {
    return this.recoveryService.approve(user.sub, id, dto.signature);
  }

  @Patch('approvals/:id/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Decline a recovery request as a guardian' })
  decline(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.decline(user.sub, id);
  }
}
