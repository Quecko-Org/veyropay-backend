
export interface IRecordDeposit {
    walletId: string;
    chain: string;
    asset: string;
    amount: string;
    txHash: string;
    fromAddress: string;
    providerReference: string;
  }