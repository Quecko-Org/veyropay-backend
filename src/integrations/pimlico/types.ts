// The mobile client signs the UserOperation locally (via Turnkey) - the backend
// never holds signing keys. This is an opaque, already-signed ERC-4337 UserOperation;
// field names vary slightly by EntryPoint version, so this is deliberately loose.
export type IUserOperation = Record<string, unknown>;

export interface IUserOperationReceipt {
  userOpHash: string;
  transactionHash: string;
  success: boolean;
  reason?: string;
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


// Response of Pimlico's `pm_sponsorUserOperation` (EntryPoint v0.7 shape - separate
// paymaster fields, not a single combined paymasterAndData blob like v0.6).
export interface IPimlicoSponsorUserOperationResult {
  paymaster: string;
  paymasterData: string;
  paymasterVerificationGasLimit: string;
  paymasterPostOpGasLimit: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
}

export interface ISponsorUserOperationParams {
  sender: string;
  nonce: string;
  factory?: string;
  factoryData?: string;
  callData: string;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  signature: string;
}

