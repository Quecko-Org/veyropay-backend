import { Injectable, Logger ,BadRequestException} from '@nestjs/common';
import { NotificationType, TransactionType } from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { TransactionService } from '@modules/transaction/transaction.service';
import { TransactionEntity } from '@modules/transaction/entities/transaction.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { OneinchService } from '@integrations/oneinch/oneinch.service';
import { LifiService } from '@integrations/lifi/lifi.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { IUserOperationReceipt } from '@integrations/pimlico/types';
import { ILifiStatusResponse } from '@integrations/lifi/types';
import { PreviewSwapDto } from './dto/preview-swap.dto';
import { ExecuteSwapDto } from './dto/execute-swap.dto';


import { Address, encodeFunctionData } from 'viem';
// ...existing imports...
import { CheckSwapApprovalDto } from './dto/check-swap-approval.dto';

const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export interface ICheckApprovalResult {
  needsApproval: boolean;
  transaction?: {
    to: string;
    data: string;
    value: string;
  };
}
const RECEIPT_POLL_MAX_ATTEMPTS = 20;
const RECEIPT_POLL_INTERVAL_MS = 3000;

// The cross-chain bridge leg runs well after the source-chain UserOp lands and can
// take minutes, not seconds - a much longer/slower poll than the receipt check above.
const BRIDGE_POLL_MAX_ATTEMPTS = 40;
const BRIDGE_POLL_INTERVAL_MS = 15000;

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);

  constructor(
    private readonly oneinchService: OneinchService,
    private readonly lifiService: LifiService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly pimlicoService: PimlicoService,
  ) {}

  async previewQuote(dto: PreviewSwapDto) {
    console.log("dto",dto)

    if (dto.fromChain === dto.toChain) {
      console.log("oneinch")
      return this.oneinchService.getSwapTransaction({
        chainId: Number(dto.fromChain),
        src: dto.fromAsset,
        dst: dto.toAsset,
        amount: dto.amount,
        from: dto.fromAddress,
      slippage: dto.slippage ?? 1,
      });
    }

    return this.lifiService.getQuote({
      fromChain:  dto.fromChain,
      toChain: dto.toChain,
      fromToken: dto.fromAsset,
      toToken: dto.toAsset,
      fromAmount: dto.amount,
      fromAddress: dto.fromAddress,
    });
  }

  // A token-input swap needs the router to be able to pull the source token via
// transferFrom() - that requires a prior ERC20 approve() from the Safe, which is
// outside the swap UserOperation itself. Call this before /prepare for a token
// source; skip it entirely for a native-ETH source (no approval concept applies).
async checkApproval(dto: CheckSwapApprovalDto): Promise<ICheckApprovalResult> {
  const isCrossChain = dto.fromChain !== dto.toChain;

  if (!isCrossChain) {
    const { allowance } = await this.oneinchService.getAllowance(
      Number(dto.fromChain),
      dto.tokenAddress,
      dto.ownerAddress,
    );
    console.log("allowance",allowance)

    if (BigInt(allowance) >= BigInt(dto.amount)) {
      return { needsApproval: false };
    }

    const approvalTx = await this.oneinchService.getApprovalTransaction(
      Number(dto.fromChain),
      dto.tokenAddress,
      dto.amount,
    );
    console.log("approvalTx",approvalTx)

    return { needsApproval: true, transaction: approvalTx };
  }

  if (!dto.spenderAddress) {
    throw new BadRequestException(
      'spenderAddress is required for a cross-chain approval check - use the ' +
        "preview response's estimate.approvalAddress",
    );
  }

  const currentAllowance = await this.pimlicoService.getAllowance(
    dto.tokenAddress as Address,
    dto.ownerAddress as Address,
    dto.spenderAddress as Address,
  );

  if (currentAllowance >= BigInt(dto.amount)) {
    return { needsApproval: false };
  }

  const data = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: 'approve',
    args: [dto.spenderAddress as Address, BigInt(dto.amount)],
  });

  return {
    needsApproval: true,
    transaction: { to: dto.tokenAddress, data, value: '0' },
  };
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
      fee: dto.fee,
      provider: isCrossChain ? 'lifi' : 'oneinch',
    });

    try {
      const userOpHash = await this.pimlicoService.submitUserOperation(dto.signedUserOperation);
      console.log("uerOphas",userOpHash)
      const submitted = await this.transactionService.recordSubmitted(transaction.id, userOpHash);

      void this.finalizeOnceReceiptKnown(transaction.id, userId, userOpHash, dto);

      return submitted;
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

  private async finalizeOnceReceiptKnown(
    transactionId: string,
    userId: string,
    userOpHash: string,
    dto: ExecuteSwapDto,
  ): Promise<void> {
    try {
      const receipt = await this.waitForReceipt(userOpHash);
console.log("waitttt",receipt)
      if (!receipt?.success) {
        await this.transactionService.markFailed(transactionId);
        await this.notificationService.notify(
          userId,
          NotificationType.SWAP,
          'Swap failed',
          `Could not swap ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
        );
        return;
      }

      const isCrossChain = dto.fromChain !== dto.toChain;
      if (!isCrossChain) {
        await this.transactionService.markConfirmed(transactionId, receipt.transactionHash);
        await this.notificationService.notify(
          userId,
          NotificationType.SWAP,
          'Swap completed',
          `Swapped ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
        );
        return;
      }

      const bridgeStatus = await this.waitForBridgeCompletion(
        receipt.transactionHash,
        dto.fromChain,
        dto.toChain,
      );

      if (bridgeStatus?.status === 'DONE') {
        await this.transactionService.markConfirmed(
          transactionId,
          bridgeStatus.receiving?.txHash ?? receipt.transactionHash,
        );
        await this.notificationService.notify(
          userId,
          NotificationType.SWAP,
          'Swap completed',
          `Swapped ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
        );
      } else if (bridgeStatus?.status === 'FAILED') {
        await this.transactionService.markFailed(transactionId);
        await this.notificationService.notify(
          userId,
          NotificationType.SWAP,
          'Swap failed',
          `Could not swap ${dto.amount} ${dto.fromAsset} for ${dto.toAsset}.`,
        );
      } else {
        this.logger.warn(
          { transactionId, sourceTxHash: receipt.transactionHash },
          'LiFi bridge status still unresolved after max polling attempts',
        );
      }
    } catch (error) {
      this.logger.error({ err: error, transactionId, userOpHash }, 'Swap finalization failed');
    }
  }

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

  private async waitForBridgeCompletion(
    sourceTxHash: string,
    fromChain: string,
    toChain: string,
  ): Promise<ILifiStatusResponse | null> {
    let lastStatus: ILifiStatusResponse | null = null;

    for (let attempt = 0; attempt < BRIDGE_POLL_MAX_ATTEMPTS; attempt++) {
      lastStatus = await this.lifiService.getStatus(sourceTxHash, fromChain, toChain);
      if (lastStatus?.status === 'DONE' || lastStatus?.status === 'FAILED') {
        return lastStatus;
      }
      await new Promise((resolve) => setTimeout(resolve, BRIDGE_POLL_INTERVAL_MS));
    }

    return lastStatus;
  }
}