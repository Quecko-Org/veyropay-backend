// The mobile client signs the UserOperation locally (via Turnkey) - the backend
// never holds signing keys. This is an opaque, already-signed ERC-4337 UserOperation;
// field names vary slightly by EntryPoint version, so this is deliberately loose.
export type IUserOperation = Record<string, unknown>;

export interface IUserOperationReceipt {
  userOpHash: string;
  transactionHash: string;
  success: boolean;
}

export interface IJsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

export interface IGasPriceTier {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

// Response of Pimlico's `pimlico_getUserOperationGasPrice` method.
export interface IPimlicoGasPriceResponse {
  slow: IGasPriceTier;
  standard: IGasPriceTier;
  fast: IGasPriceTier;
}
