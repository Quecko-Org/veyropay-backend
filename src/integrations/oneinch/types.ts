export interface IOneinchQuoteRequest {
  chainId: number;
  src: string;
  dst: string;
  amount: string;
}

export interface IOneinchAllowanceResponse {
  allowance: string;
}

// Ready-to-use plain transaction - `to` is the TOKEN contract (approve() is called ON
// the token, not the router), `data` already encodes approve(spender, amount) with
// 1inch's own router as spender.
export interface IOneinchApprovalTransactionResponse {
  to: string;
  data: string;
  value: string;
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
