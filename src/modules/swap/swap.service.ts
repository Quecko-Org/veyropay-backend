import { Injectable } from '@nestjs/common';
import { NotificationType, TransactionType } from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { TransactionService } from '@modules/transaction/transaction.service';
import { TransactionEntity } from '@modules/transaction/entities/transaction.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { OneinchService } from '@integrations/oneinch/oneinch.service';
import { LifiService } from '@integrations/lifi/lifi.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { PreviewSwapDto } from './dto/preview-swap.dto';
import { ExecuteSwapDto } from './dto/execute-swap.dto';

@Injectable()
export class SwapService {
  constructor(
    private readonly oneinchService: OneinchService,
    private readonly lifiService: LifiService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly pimlicoService: PimlicoService,
  ) {}

  // Cross-chain swaps route through LiFi; same-chain swaps route through 1inch.
  // Per docs/09_PAYMENT_AND_SETTLEMENT_FLOW.md, LiFi is only invoked when the
  // source and destination chains differ.
  async previewQuote(dto: PreviewSwapDto) {
    if (dto.fromChain === dto.toChain) {
      return this.oneinchService.getQuote({
        chainId: Number(dto.fromChain),
        src: dto.fromAsset,
        dst: dto.toAsset, 
        amount: dto.amount,
      });
    } 

    return this.lifiService.getQuote({
      fromChain: dto.fromChain,
      toChain: dto.toChain,
      fromToken: dto.fromAsset,
      toToken: dto.toAsset,
      fromAmount: dto.amount,
      fromAddress: dto.fromAddress,
    });
  }

  async execute(userId: string, dto: ExecuteSwapDto): Promise<TransactionEntity> {
    const wallet = await this.walletService.getByUserId(userId);
    const isCrossChain = dto.fromChain !== dto.toChain;

    const transaction = await this.transactionService.record({
      walletId: wallet.id,
      type: TransactionType.SWAP,
      chain: dto.toChain,
      asset: dto.toAsset,
      amount: dto.amount,
      provider: isCrossChain ? 'lifi' : 'oneinch',
    });

    try {
      const userOpHash = await this.pimlicoService.submitUserOperation(dto.signedUserOperation);
      const confirmed = await this.transactionService.markConfirmed(transaction.id, userOpHash);

      await this.notificationService.notify(
        userId,
        NotificationType.SWAP,
        'Swap completed',
        `Swapped ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
      );

      return confirmed;
    } catch (error) {
      await this.transactionService.markFailed(transaction.id);

      await this.notificationService.notify(
        userId,
        NotificationType.SWAP,
        'Swap failed',
        `Could not swap ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
      );

      throw error;
    }
  }
}
