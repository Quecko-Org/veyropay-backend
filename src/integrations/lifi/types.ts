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
