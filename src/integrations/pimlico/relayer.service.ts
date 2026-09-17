import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, Hex, TransactionSerializable } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ProviderException } from '@common/exceptions';
import { IPimlicoConfig } from '@core/config/pimlico.config';
import { PimlicoClient } from './pimlico.client';
import { PIMLICO_PROVIDER_NAME } from './constants';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
// Backend-as-relayer for guardian recovery: a conventional EOA (distinct from the
// ERC-4337 UserOperation path used everywhere else in this app) that signs and
// broadcasts plain Ethereum transactions carrying already guardian-authorized recovery
// calldata. Legitimate because the relayer cannot fabricate approvals - the
// SocialRecoveryModule verifies every guardian signature on-chain before acting on it;
// this service only pays gas and submits, never signs on behalf of a user or guardian.
// See docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private readonly config: IPimlicoConfig;

  constructor(
    private readonly client: PimlicoClient,
    private readonly chainRpcClient: ChainRpcClient,
    configService: ConfigService,
  ) {
    this.config = configService.get<IPimlicoConfig>('pimlico') as IPimlicoConfig;
  }

  getAddress(): Address {
    try {
      return privateKeyToAccount(this.config.relayerPrivateKey as Hex).address;
    } catch (error) {
      this.logger.warn({ err: error }, 'Relayer private key is invalid');
      throw new ProviderException(
        PIMLICO_PROVIDER_NAME,
        'RELAYER_PRIVATE_KEY is invalid - set a funded 0x + 64 hex EOA key in .env',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // Signs and broadcasts a plain EIP-1559 transaction from the relayer's own EOA.
  // Waits for the receipt so callers can safely read post-state (e.g. getRecoveryRequest).
  async relayTransaction(to: Address, data: Hex): Promise<Hex> {
    let account;
    try {
      account = privateKeyToAccount(this.config.relayerPrivateKey as Hex);
    } catch (error) {
      this.logger.warn({ err: error }, 'Relayer private key is invalid');
      throw new ProviderException(
        PIMLICO_PROVIDER_NAME,
        'RELAYER_PRIVATE_KEY is invalid - set a funded 0x + 64 hex EOA key in .env',
        HttpStatus.BAD_GATEWAY,
      );
    }

    try {
      const [nonceHex, gasPrice] = await Promise.all([
        this.chainRpcClient.getTransactionCount(account.address),
        this.client.getGasPrice(),
      ]);

      const transaction: TransactionSerializable = {
        type: 'eip1559',
        chainId: this.config.relayerChainId,
        to,
        data,
        value: 0n,
        nonce: Number(BigInt(nonceHex)),
        maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas),
        // Fixed conservative gas limit for a single Safe module call - avoids an extra
        // eth_estimateGas round trip. Revisit if recovery calldata complexity grows.
        gas: 500_000n,
      };

      const signedTransaction = await account.signTransaction(transaction);
      const txHash = (await this.chainRpcClient.sendRawTransaction(signedTransaction)) as Hex;

      // Must wait for inclusion before callers read module state - broadcasting alone
      // leaves getRecoveryRequest empty and falsely looks like confirm failed.
      const receipt = await this.chainRpcClient.waitForTransactionReceipt(txHash);
      if (receipt.status !== '0x1') {
        throw new ProviderException(
          PIMLICO_PROVIDER_NAME,
          `Relayed recovery transaction reverted (${txHash})`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return txHash;
    } catch (error) {
      if (error instanceof ProviderException) {
        throw error;
      }
      this.logger.warn({ err: error }, 'Relayer transaction submission failed');
      const message =
        error instanceof Error && error.message.includes('insufficient funds')
          ? `Relayer EOA ${account.address} has insufficient Base Sepolia ETH to submit recovery transactions — fund it from a faucet`
          : 'Unable to relay the recovery transaction';
      throw new ProviderException(PIMLICO_PROVIDER_NAME, message, HttpStatus.BAD_GATEWAY);
    }
  }
}
