import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto } from '@shared/dto';
import { TransactionStatus } from '@shared/enums';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionEntity } from './entities/transaction.entity';
import { IRecordTransaction } from './interfaces';
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

  async markConfirmed(id: string, txHash?: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.CONFIRMED, txHash);
  }

  // `reason` is the on-chain revert reason (from the receipt) or a submission-level
  // error message - stored so an API consumer can see why a transaction failed,
  // rather than that detail only ever reaching the server logs.
  async markFailed(id: string, reason?: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.FAILED, undefined, reason);
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
  ): Promise<TransactionEntity> {
    const transaction = await this.getById(id);
    transaction.status = status;
    if (txHash) {
      transaction.txHash = txHash;
    }
    if (failureReason) {
      transaction.failureReason = failureReason;
    }

    return this.transactionRepository.save(transaction);
  }
}