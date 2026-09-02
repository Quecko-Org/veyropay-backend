export interface ILifiQuoteRequest {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export interface ILifiQuoteResponse {
  estimate: {
    toAmount: string;
    executionDuration: number;
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
  };
}

// Response of LiFi's GET /status - tracks the actual cross-chain bridge transfer,
// which is a separate, asynchronous process from the source-chain transaction itself.
// See docs.li.fi/li.fi-api/li.fi-api/status-of-a-transaction.
export interface ILifiStatusResponse {
  status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  sending?: {
    txHash: string;
    chainId: number;
    amount?: string;
  };
  receiving?: {
    txHash: string;
    chainId: number;
    amount?: string;
  };
}
