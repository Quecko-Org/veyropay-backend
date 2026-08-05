import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { TransactionService } from './transaction.service';

// Per-owner transaction listings are exposed by the modules that own the
// wallet/card relationship (GET /wallet/transactions, GET /card/:id/transactions).
// This controller covers direct lookups (e.g. reconciliation, support tooling).
@ApiTags('transaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'transaction', version: '1' })
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  getById(@Param('id') id: string) {
    return this.transactionService.getById(id);
  }
}
