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
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { InviteGuardianDto, SearchGuardianByAddressDto, SearchGuardianDto } from './dto';
import { GuardianService } from './guardian.service';

@ApiTags('guardian')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'guardian', version: '1' })
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Get('search')
  @ApiOperation({ summary: 'Look up a user by email to invite as a guardian' })
  search(@CurrentUser() user: IJwtPayload, @Query() query: SearchGuardianDto) {
    return this.guardianService.search(user.sub, query.email);
  }

  @Get('searchBySmartWalletAddress')
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
  @ApiOperation({
    summary: 'List all guardian invitations received by the authenticated user',
    description:
      'Returns pending, approved, and rejected invites, sorted by status then newest first.',
  })
  listIncoming(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.listIncoming(user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'List all guardian invitations sent by the authenticated user',
    description:
      'Returns pending, approved, and rejected invites, sorted by status then newest first.',
  })
  listOutgoing(@CurrentUser() user: IJwtPayload) {
    return this.guardianService.listOutgoing(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Send a guardian invitation to a found user' })
  invite(@CurrentUser() user: IJwtPayload, @Body() dto: InviteGuardianDto) {
    return this.guardianService.invite(user.sub, dto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a received guardian invitation' })
  accept(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.accept(user.sub, id);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline a received guardian invitation' })
  decline(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.decline(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove or cancel a sent guardian invitation' })
  remove(@CurrentUser() user: IJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.remove(user.sub, id);
  }
}
