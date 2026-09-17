import {
  Body,
  Controller,
  Delete,
  Get,
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
import {
  GuardianOnChainStatusQueryDto,
  InviteGuardianDto,
  SearchGuardianByAddressDto,
  SearchGuardianDto,
} from './dto';
import { GUARDIAN_PUBLIC_THROTTLE_LIMIT, GUARDIAN_PUBLIC_THROTTLE_TTL_MS } from './constants';
import { GuardianService } from './guardian.service';

@ApiTags('guardian')
@Controller({ path: 'guardian', version: '1' })
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Get('search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Look up a user by email to invite as a guardian' })
  search(@CurrentUser() user: IJwtPayload, @Query() query: SearchGuardianDto) {
    return this.guardianService.search(user.sub, query.email);
  }

  @Get('searchBySmartWalletAddress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Look up a user by smart wallet address to invite as a guardian',
  })
  searchBySmartWalletAddress(
    @CurrentUser() user: IJwtPayload,
    @Query() query: SearchGuardianByAddressDto,
  ) {
    return this.guardianService.searchBySmartWalletAddress(user.sub, query.address);
  }

  @Get('incoming')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all guardian invitations received by the authenticated user',
    description:
      'Returns pending, approved, and rejected invites, sorted by status then newest first.',
  })
  listIncoming(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.listIncoming(user.sub);
  }

  @Get('on-chain-status')
  @Throttle({
    default: { limit: GUARDIAN_PUBLIC_THROTTLE_LIMIT, ttl: GUARDIAN_PUBLIC_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Compare approved guardians in-app vs registered on-chain',
    description:
      'Public (no JWT). Pass walletId from recovery lookup. Returns counts and per-guardian ' +
      'SocialRecoveryModule.isGuardian flags. readyForRecovery is true only when every approved ' +
      'guardian is registered on-chain.',
  })
  getOnChainStatus(@Query() query: GuardianOnChainStatusQueryDto) {
    return this.guardianService.getOnChainStatus(query.walletId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all guardian invitations sent by the authenticated user',
    description:
      'Returns pending, approved, and rejected invites, sorted by status then newest first.',
  })
  listOutgoing(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.listOutgoing(user.sub);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a guardian invitation to a found user' })
  invite(@CurrentUser() user: IJwtPayload, @Body() dto: InviteGuardianDto) {
    return this.guardianService.invite(user.sub, dto);
  }

  @Get(':id/on-chain-registration')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get Safe UserOp calldata to register an accepted guardian on-chain',
    description:
      'Returns enableModule (if needed) + addGuardian calldata. For brand-new accounts the Safe ' +
      'may not be deployed yet (safeDeployed=false) — POST /wallet/user-operations/prepare with ' +
      'enableModule first; prepare auto-includes factory deployment. Then prepare+execute addGuardian. ' +
      'Required before social recovery.',
  })
  getOnChainRegistration(
    @CurrentUser() user: IJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.guardianService.getOnChainRegistration(user.sub, id);
  }

  @Patch(':id/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept a received guardian invitation' })
  accept(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.accept(user.sub, id);
  }

  @Patch(':id/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Decline a received guardian invitation' })
  decline(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.decline(user.sub, id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove or cancel a sent guardian invitation' })
  remove(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.remove(user.sub, id);
  }
}
