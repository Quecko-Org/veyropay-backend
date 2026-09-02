import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISafeConfig } from '@core/config/safe.config';
import { decodeFunctionResult, encodeFunctionData } from 'viem'; // add to your viem import

const ERC20_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Plain standard Ethereum JSON-RPC client (eth_call, eth_getCode, eth_getBalance,
// eth_getTransactionCount, eth_sendRawTransaction, eth_chainId). Pimlico's bundler/
// paymaster endpoint (see PimlicoClient) does NOT implement these - it only supports
// the ERC-4337 bundler methods, pm_* paymaster methods, and pimlico_* extensions;
// calling eth_call/eth_getCode there returns -32601 "Method not found" (confirmed
// against docs.pimlico.io). This hits a real node RPC provider instead, via the same
// SAFE_RPC_URL @safe-global/protocol-kit already uses.
@Injectable()
export class ChainRpcClient {
  private readonly rpcUrl: string;
  private readonly timeoutMs = 10000;
  private nextRequestId = 1;

  constructor(configService: ConfigService) {
    this.rpcUrl = (configService.get<ISafeConfig>('safe') as ISafeConfig).rpcUrl;
  }

  async ethCall(to: string, data: string): Promise<string> {
    return this.rpcCall<string>('eth_call', [{ to, data }, 'latest']);
  }

  async getCode(address: string): Promise<string> {
    return this.rpcCall<string>('eth_getCode', [address, 'latest']);
  }

  async getBalance(address: string): Promise<string> {
    return this.rpcCall<string>('eth_getBalance', [address, 'latest']);
  }

  async getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<string> {
    const data = encodeFunctionData({
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress as `0x${string}`],
    });

    const result = await this.rpcCall<string>('eth_call', [{ to: tokenAddress, data }, 'latest']);

    const balance = decodeFunctionResult({
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      data: result as `0x${string}`,
    });

    return balance.toString();
  }

  async getTransactionCount(address: string): Promise<string> {
    return this.rpcCall<string>('eth_getTransactionCount', [address, 'pending']);
  }

  async sendRawTransaction(signedTransaction: string): Promise<string> {
    return this.rpcCall<string>('eth_sendRawTransaction', [signedTransaction]);
  }

  async chainId(): Promise<string> {
    return this.rpcCall<string>('eth_chainId', []);
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: this.nextRequestId++, method, params }),
        signal: controller.signal,
      });
      console.log('Request', response, this.rpcUrl);

      if (!response.ok) {
        throw new Error(`Chain RPC request failed with status ${response.status}`);
      }

      const json = (await response.json()) as {
        result?: T;
        error?: { code: number; message: string };
      };

      if (json.error) {
        throw new Error(`Chain RPC error (${json.error.code}): ${json.error.message}`);
      }

      return json.result as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
