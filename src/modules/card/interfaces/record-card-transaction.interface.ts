export interface IRecordCardTransaction {
  merchant: string;
  amount: string;
  currency: string;
  settlementCurrency: string;
  providerReference?: string;
}
