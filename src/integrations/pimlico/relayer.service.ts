import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, Hex, TransactionSerializable } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ProviderException } from '@common/exceptions';
import { IPimlicoConfig } from '@core/config/pimlico.config';
import { PimlicoClient } from './pimlico.client';
import { PIMLICO_PROVIDER_NAME } from './constants';

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
    configService: ConfigService,
  ) {
    this.config = configService.get<IPimlicoConfig>('pimlico') as IPimlicoConfig;
  }

  getAddress(): Address {
    return privateKeyToAccount(this.config.relayerPrivateKey as Hex).address;
  }

  // Signs and broadcasts a plain EIP-1559 transaction from the relayer's own EOA.
  // Returns the transaction hash immediately after broadcast - like the rest of this
  // codebase's submission flows (see TransferService), it does not poll for the receipt.
  async relayTransaction(to: Address, data: Hex): Promise<Hex> {
    try {
      const account = privateKeyToAccount(this.config.relayerPrivateKey as Hex);

      const [nonceHex, gasPrice] = await Promise.all([
        this.client.getTransactionCount(account.address),
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
      return (await this.client.sendRawTransaction(signedTransaction)) as Hex;
    } catch (error) {
      this.logger.warn({ err: error }, 'Relayer transaction submission failed');
      throw new ProviderException(
        PIMLICO_PROVIDER_NAME,
        'Unable to relay the recovery transaction',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
