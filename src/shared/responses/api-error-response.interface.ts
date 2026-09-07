export interface IApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  // The raw underlying error message/body from a third-party provider (Pimlico,
  // 1inch, LiFi, chain RPC, ...) when the failure originated there. Absent for
  // non-provider errors (validation, auth, etc), where `message` already says enough.
  details?: string;
  // The status/code the provider itself reported - real HTTP status for an HTTP
  // provider, or a JSON-RPC error code for Pimlico/eth_call. Absent for non-provider
  // errors.
  providerStatus?: number;
  // The provider's own machine-readable error code when its response body has one -
  // e.g. 1inch's "NOT_ENOUGH_ALLOWANCE" (string) or LiFi's 1011 (number). Absent when
  // the provider didn't include one, or the body wasn't JSON.
  providerCode?: string | number;
  timestamp: string;
  path: string;
  requestId?: string;
}