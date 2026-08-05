import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import { TransactionStatus } from '@shared/enums';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionEntity } from './entities/transaction.entity';
import { IRecordTransaction } from './interfaces';

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

  async markConfirmed(id: string, txHash?: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.CONFIRMED, txHash);
  }

  async markFailed(id: string): Promise<TransactionEntity> {
    return this.updateStatus(id, TransactionStatus.FAILED);
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
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<TransactionEntity>> {
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.transactionRepository.findAndCountForWallet(
      walletId,
      skip,
      take,
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
  ): Promise<TransactionEntity> {
    const transaction = await this.getById(id);
    transaction.status = status;
    if (txHash) {
      transaction.txHash = txHash;
    }

    return this.transactionRepository.save(transaction);
  }
}
