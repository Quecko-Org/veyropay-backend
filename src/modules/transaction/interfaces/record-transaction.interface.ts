import { TransactionType } from '@shared/enums';

export interface IRecordTransaction {
  walletId: string;
  type: TransactionType;
  provider?: string;
  chain: string;
  asset: string;
  amount: string;
  fee?: string;
  txHash?: string;
  providerReference?: string;
  toAddress?: string;
}
