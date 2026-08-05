import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { PaginationQueryDto } from '@shared/dto';
import { CardService } from './card.service';
import { SetSpendLimitDto } from './dto/set-spend-limit.dto';

@ApiTags('card')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'card', version: '1' })
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @ApiOperation({ summary: 'Order a virtual card (requires approved KYC)' })
  issue(@CurrentUser() user: IJwtPayload) {
    return this.cardService.issueCard(user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user card' })
  getCard(@CurrentUser() user: IJwtPayload) {
    return this.cardService.getByUserId(user.sub);
  }

  @Patch('freeze')
  @ApiOperation({ summary: 'Freeze the card' })
  freeze(@CurrentUser() user: IJwtPayload) {
    return this.cardService.freeze(user.sub);
  }

  @Patch('unfreeze')
  @ApiOperation({ summary: 'Unfreeze the card' })
  unfreeze(@CurrentUser() user: IJwtPayload) {
    return this.cardService.unfreeze(user.sub);
  }

  @Patch('spend-limit')
  @ApiOperation({ summary: 'Update the card spend limit' })
  setSpendLimit(@CurrentUser() user: IJwtPayload, @Body() dto: SetSpendLimitDto) {
    return this.cardService.setSpendLimit(user.sub, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List card transactions' })
  listTransactions(@CurrentUser() user: IJwtPayload, @Query() query: PaginationQueryDto) {
    return this.cardService.listTransactions(user.sub, query);
  }
}
