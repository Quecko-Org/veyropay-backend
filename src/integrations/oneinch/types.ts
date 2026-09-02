export interface IOneinchQuoteRequest {
  chainId: number;
  src: string;
  dst: string;
  amount: string;
}

export interface IOneinchQuoteResponse {
  dstAmount: string;
  gas: number;
}

export interface IOneinchSwapRequest extends IOneinchQuoteRequest {
  from: string;
  slippage: number;
}

// Unsigned calldata the client signs locally before it comes back through
// POST /swap/execute as part of a signed UserOperation.
export interface IOneinchSwapResponse {
  dstAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
  };
}
