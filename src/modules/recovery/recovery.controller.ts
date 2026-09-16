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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { AuthTokensDto } from '@modules/auth/dto/auth-tokens.dto';
import { RECOVERY_PUBLIC_THROTTLE_LIMIT, RECOVERY_PUBLIC_THROTTLE_TTL_MS } from './constants';
import {
  CreateRecoveryRequestDto,
  LookupRecoveryByAddressDto,
  LookupRecoveryByEmailDto,
  ApproveRecoveryDto,
  CancelRecoveryDto,
  ClaimRecoveryDto,
  ListRecoveryRequestsDto,
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
      'threshold triggers relayer multiConfirmRecovery (DB alone cannot move the Safe). ' +
      'Only one pending or approved (not yet executed) request is allowed per wallet.',
  })
  createRequest(@Body() dto: CreateRecoveryRequestDto) {
    return this.recoveryService.createRequest(dto);
  }

  @Get('requests')
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'List recovery requests for a wallet with per-guardian approval status',
    description:
      'Use walletId from lookup. Each item includes approvals[] (guardianName + status: ' +
      'pending / approved / rejected) so you can see who has approved.',
  })
  listRequests(@Query() query: ListRecoveryRequestsDto) {
    return this.recoveryService.listRequests(query.walletId, query.status);
  }

  @Get('requests/:id')
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({ summary: 'Poll recovery request status, hash, and per-guardian approvals' })
  getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.getRequest(id);
  }

  @Post('requests/:id/execute')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Confirm and/or finalize on-chain social recovery',
    description:
      '1) Relays multiConfirmRecovery if not yet started (starts module grace period). ' +
      '2) After finalizeAfter, relays finalizeRecovery which swaps Safe owners. ' +
      'Poll GET request for finalizeAfter; call this again when the grace period ends. ' +
      'Also repairs stuck executed rows where owners were not swapped yet.',
  })
  retryExecute(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.retryExecute(id);
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Cancel a pending or stuck approved recovery',
    description:
      'Email must match requester or wallet owner. Required before starting a new recovery ' +
      'while another is pending/approved.',
  })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelRecoveryDto) {
    return this.recoveryService.cancel(id, dto);
  }

  @Post('requests/:id/claim')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: RECOVERY_PUBLIC_THROTTLE_LIMIT, ttl: RECOVERY_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Open the recovered wallet after on-chain execute',
    description:
      'Pass the Turnkey sessionJwt from stampLogin() with the new recovery passkey. ' +
      'Verifies the session controls newOwnerAddress and that the Safe owner changed on-chain, ' +
      'rebinds the wallet owner identity, and returns app JWTs. Then call GET /wallet.',
  })
  claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimRecoveryDto,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.recoveryService.claim(id, dto, { ipAddress: req.ip });
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
