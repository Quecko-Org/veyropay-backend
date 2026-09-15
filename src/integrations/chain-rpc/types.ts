export interface IEthLog {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  logIndex: string;
  blockNumber: string;
}

export interface IEthTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
}

export interface IEthBlock {
  number: string;
  transactions: IEthTransaction[];
}