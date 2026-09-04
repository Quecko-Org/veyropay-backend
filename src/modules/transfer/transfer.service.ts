import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, TransactionType } from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { TransactionService } from '@modules/transaction/transaction.service';
import { TransactionEntity } from '@modules/transaction/entities/transaction.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { IUserOperationReceipt } from '@integrations/pimlico/types';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';

const RECEIPT_POLL_MAX_ATTEMPTS = 20;
const RECEIPT_POLL_INTERVAL_MS = 3000;

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

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
      toAddress: dto.toAddress,
      provider: 'pimlico',
    });

    try {
      const userOpHash = await this.pimlicoService.submitUserOperation(dto.signedUserOperation);
      // eth_sendUserOperation only means the bundler accepted this into its mempool -
      // not that it succeeded on-chain. Record the hash but stay PENDING; the actual
      // outcome is reconciled below, off the request/response cycle, once the real
      // receipt is known.
      const submitted = await this.transactionService.recordSubmitted(transaction.id, userOpHash);

      void this.finalizeOnceReceiptKnown(transaction.id, userId, userOpHash, dto);

      return submitted;
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

  // Runs in the background (not awaited by send()) so the HTTP response isn't held
  // open for however long the UserOp takes to actually land. Swallows its own errors -
  // nothing upstream is waiting on this promise to reject into.
  private async finalizeOnceReceiptKnown(
    transactionId: string,
    userId: string,
    userOpHash: string,
    dto: InitiateTransferDto,
  ): Promise<void> {
    try {
      const receipt = await this.waitForReceipt(userOpHash);

      if (receipt?.success) {
        await this.transactionService.markConfirmed(transactionId, receipt.transactionHash);
        await this.notificationService.notify(
          userId,
          NotificationType.TRANSFER,
          'Transfer sent',
          `Sent ${dto.amount} ${dto.asset} on ${dto.chain}.`,
        );
      } else {
        await this.transactionService.markFailed(transactionId);
        await this.notificationService.notify(
          userId,
          NotificationType.TRANSFER,
          'Transfer failed',
          `Could not send ${dto.amount} ${dto.asset} on ${dto.chain}.`,
        );
      }
    } catch (error) {
      this.logger.error({ err: error, transactionId, userOpHash }, 'Transfer finalization failed');
    }
  }

  // Polls eth_getUserOperationReceipt until it resolves or the timeout elapses. A
  // still-null receipt after RECEIPT_POLL_MAX_ATTEMPTS is treated as failed rather than
  // left pending forever - revisit the timeout if this chain routinely takes longer.
  private async waitForReceipt(userOpHash: string): Promise<IUserOperationReceipt | null> {
    for (let attempt = 0; attempt < RECEIPT_POLL_MAX_ATTEMPTS; attempt++) {
      const receipt = await this.pimlicoService.getReceipt(userOpHash);
      if (receipt) {
        return receipt;
      }
      await new Promise((resolve) => setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS));
    }

    return null;
  }
}
