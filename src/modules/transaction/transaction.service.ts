import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto } from '@shared/dto';
import { TransactionStatus, TransactionType } from '@shared/enums';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionEntity } from './entities/transaction.entity';
import { IRecordDeposit, IRecordTransaction } from './interfaces';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async record(data: IRecordTransaction): Promise<TransactionEntity> {
    const transaction = this.transactionRepository.create({
      ...data,
      fee: data.fee ?? '0',
      status: TransactionStatus.PENDING,
    });

    return this.transactionRepository.save(transaction);
  }

  // Attaches the bundler-assigned userOpHash right after submission, without
  // transitioning out of PENDING - actual confirmation still waits on the real
  // on-chain receipt (see TransferService.waitForReceipt).
  async recordSubmitted(id: string, userOpHash: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.PENDING, userOpHash);
  }









  // `receivedAmount` overrides the quoted estimate recorded at execute() time - pass
  // it when the real received amount is known (currently only LiFi's bridge-status
  // poll reports this, for a cross-chain swap's destination leg). Omit it for a
  // TRANSFER or a same-chain swap, where the quoted figure is the only value we ever
  // have and should be left as-is.
  async markConfirmed(
    id: string,
    txHash?: string,
    receivedAmount?: string,
  ): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.CONFIRMED, txHash, undefined, receivedAmount);
  }

  // `reason` is the on-chain revert reason (from the receipt) or a submission-level
  // error message - stored so an API consumer can see why a transaction failed,
  // rather than that detail only ever reaching the server logs.
  async markFailed(id: string, reason?: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.FAILED, undefined, reason);
  }

  // Records an incoming on-chain transfer detected via the Alchemy Address Activity
  // webhook. Unlike record() (used by TRANSFER/SWAP, which our own backend initiates
  // and always starts PENDING), a deposit is only ever known about after the fact -
  // Alchemy only fires once it's already mined - so this goes straight to CONFIRMED,
  // no separate "submitted" stage.
  //
  // Idempotent on providerReference - Alchemy can redeliver the same webhook event,
  // so a duplicate is treated as already-recorded rather than inserted again. Returns
  // null for a duplicate so the caller knows there's nothing new to notify about.
 async recordDeposit(data: IRecordDeposit): Promise<TransactionEntity | null> {
  const existing = await this.transactionRepository.findOne({
    where: { providerReference: data.providerReference },
  });
  if (existing) {
    return null;
  }

  const transaction = this.transactionRepository.create({
    walletId: data.walletId,
    type: TransactionType.DEPOSIT,
    provider: 'blockscan',
    chain: data.chain,
    asset: data.asset,
    amount: data.amount,
    fee: '0',
    status: TransactionStatus.CONFIRMED,
    txHash: data.txHash,
    fromAddress: data.fromAddress,
    providerReference: data.providerReference,
  });

  return this.transactionRepository.save(transaction);
}

  async getById(id: string): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async listForWallet(
    walletId: string,
    query: ListTransactionsQueryDto,
  ): Promise<PaginatedResultDto<TransactionEntity>> {
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.transactionRepository.findAndCountForWallet(
      walletId,
      skip,
      take,
      query.type,
    );

    return new PaginatedResultDto(
      items,
      total,
      query.page ?? DEFAULT_PAGE,
      query.limit ?? DEFAULT_PAGE_SIZE,
    );
  }

  private async updateStatus(
    id: string,
    status: TransactionStatus,
    txHash?: string,
    failureReason?: string,
    receivedAmount?: string,
  ): Promise<TransactionEntity> {
    const transaction = await this.getById(id);
    transaction.status = status;
    if (txHash) {
      transaction.txHash = txHash;
    }
    if (failureReason) {
      transaction.failureReason = failureReason;
    }
    if (receivedAmount) {
      transaction.receivedAmount = receivedAmount;
    }

    return this.transactionRepository.save(transaction);
  }
}