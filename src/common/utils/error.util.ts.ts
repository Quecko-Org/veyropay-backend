// Extracts a readable message from a caught value of unknown type - `catch` blocks
// only guarantee `unknown`, not `Error`, so this covers both real Error instances and
// anything else (a thrown string, a plain object, etc) without ever throwing itself.
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
  
    return String(error);
  }
  
  // Thrown by the provider HTTP/RPC clients (PimlicoClient, OneinchClient, LifiClient,
  // ChainRpcClient) instead of a plain Error, so GlobalExceptionFilter can recover the
  // actual status the provider itself reported - not just prose text - and surface it as
  // our own response's statusCode (when it's a real HTTP code) plus a separate
  // providerStatus field. For an HTTP provider (1inch, LiFi, chain RPC transport
  // failures) `status` is the real HTTP status code; for a JSON-RPC provider (Pimlico's
  // bundler, or any eth_call that returns a JSON-RPC error), which reports logical
  // failures as a 200 with a `{error: {code, message}}` body (AA21/AA24/etc - never a
  // 4xx/5xx), `status` is that JSON-RPC error code instead.
  export class ProviderHttpError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body?: string,
    ) {
      super(message);
      this.name = 'ProviderHttpError';
    }
  }
  
  export function getErrorStatus(error: unknown): number | undefined {
    if (error instanceof ProviderHttpError) {
      return error.status;
    }
  
    return undefined;
  }