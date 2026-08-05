import { Injectable } from '@nestjs/common';
import { NotificationType, TransactionType } from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { TransactionService } from '@modules/transaction/transaction.service';
import { TransactionEntity } from '@modules/transaction/entities/transaction.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';

@Injectable()
export class TransferService {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly pimlicoService: PimlicoService,
  ) {}

  async send(userId: string, dto: InitiateTransferDto): Promise<TransactionEntity> {
    const wallet = await this.walletService.getByUserId(userId);

    const transaction = await this.transactionService.record({
      walletId: wallet.id,
      type: TransactionType.TRANSFER,
      chain: dto.chain,
      asset: dto.asset,
      amount: dto.amount,
      provider: 'pimlico',
    });

    try {
      const userOpHash = await this.pimlicoService.submitUserOperation(dto.signedUserOperation);
      const confirmed = await this.transactionService.markConfirmed(transaction.id, userOpHash);

      await this.notificationService.notify(
        userId,
        NotificationType.TRANSFER,
        'Transfer sent',
        `Sent ${dto.amount} ${dto.asset} on ${dto.chain}.`,
      );

      return confirmed;
    } catch (error) {
      await this.transactionService.markFailed(transaction.id);

      await this.notificationService.notify(
        userId,
        NotificationType.TRANSFER,
        'Transfer failed',
        `Could not send ${dto.amount} ${dto.asset} on ${dto.chain}.`,
      );

      throw error;
    }
  }
}
