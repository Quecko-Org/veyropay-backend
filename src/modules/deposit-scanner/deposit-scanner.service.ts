import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { formatUnits, getAddress, pad } from 'viem';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { WalletService } from '@modules/wallet/wallet.service';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { BASE_CHAIN_ID } from '@modules/wallet/constants/chain.constant';
import { TransactionService } from '@modules/transaction/transaction.service';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationType } from '@shared/enums';
import { DepositScanCursorRepository } from './repositories/deposit-scan-cursor.repository';

// keccak256("Transfer(address,address,uint256)") - the ERC20 Transfer event topic.
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Bounds how many blocks a single run scans - matters after downtime (deploy,
// crash), so a catch-up run doesn't try an unbounded range in one call.
const MAX_BLOCKS_PER_RUN = 50n;

// Stay this many blocks behind the chain head - a lightweight reorg guard. Base
// finalizes fast but not instantly; scanning slightly behind the tip means a shallow
// reorg can't cause us to record a deposit that later gets reverted out.
const CONFIRMATION_LAG_BLOCKS = 3n;

interface IDepositCandidate {
  wallet: WalletEntity;
  chain: string;
  asset: string;
  amount: string;
  txHash: string;
  fromAddress: string;
  providerReference: string;
}

@Injectable()
export class DepositScannerService {
  private readonly logger = new Logger(DepositScannerService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly cursorRepository: DepositScanCursorRepository,
    private readonly chainRpcClient: ChainRpcClient,

  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async scanForDeposits(): Promise<void> {
    try {
      await this.runScan();
    } catch (error) {
      this.logger.error({ err: error }, 'Deposit scan failed');
    }
  }

  private async runScan(): Promise<void> {
    console.log("scan")
    const chain = String(BASE_CHAIN_ID);
    const wallets = await this.walletService.listProvisioned();
    if (wallets.length === 0) {
      return;
    }

    const walletByAddress = new Map(
      wallets
        .filter((wallet) => wallet.smartAccountAddress)
        .map((wallet) => [wallet.smartAccountAddress!.toLowerCase(), wallet]),
    );
    console.log("walletByAddress", walletByAddress)

    const latestBlock = BigInt(await this.chainRpcClient.getBlockNumber());
    const safeHead = latestBlock - CONFIRMATION_LAG_BLOCKS;

    let cursor = await this.cursorRepository.findByChain(chain);
    if (!cursor) {
      // First run ever - start from the current head, not genesis, so this doesn't
      // try to scan the chain's entire history on first deploy.
      cursor = this.cursorRepository.create({ chain, lastScannedBlock: safeHead.toString() });
      await this.cursorRepository.save(cursor);
      return;
    }

const fromBlock = BigInt(cursor.lastScannedBlock) + 1n;
    if (fromBlock > safeHead) {
      return; // nothing new and sufficiently confirmed yet
    }

    const toBlock =
      fromBlock + MAX_BLOCKS_PER_RUN - 1n < safeHead ? fromBlock + MAX_BLOCKS_PER_RUN - 1n : safeHead;

    const candidates = [
      ...(await this.scanErc20Transfers(walletByAddress, chain, fromBlock, toBlock)),
      ...(await this.scanNativeTransfers(walletByAddress, chain, fromBlock, toBlock)),
    ];
    console.log("candi", candidates)
    for (const candidate of candidates) {
      await this.recordAndNotify(candidate);
    }

    cursor.lastScannedBlock = toBlock.toString();
    await this.cursorRepository.save(cursor);
  }

  // One eth_getLogs call covers every wallet and every ERC20 token at once - Transfer
  // events are indexed on `to` (topics[2]), so this filters directly for any of our
  // known addresses without scanning per-token or per-wallet. Note: very large
  // wallet counts may hit an RPC provider's filter-size limit - revisit with batching
  // if that happens in practice.
  private async scanErc20Transfers(
    walletByAddress: Map<string, WalletEntity>,
    chain: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<IDepositCandidate[]> {
    const toTopics = [...walletByAddress.keys()].map(
      (address) => pad(address as `0x${string}`, { size: 32 }) as string,
    );

    const logs = await this.chainRpcClient.getLogs({
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [TRANSFER_EVENT_TOPIC, null, toTopics],
    });

    const candidates: IDepositCandidate[] = [];
    for (const log of logs) {
      const toAddress = `0x${log.topics[2].slice(-40)}`.toLowerCase();
      const wallet = walletByAddress.get(toAddress);
      if (!wallet) {
        continue;
      }

      candidates.push({
        wallet,
        chain,
        asset: log.address,
        // Decimals aren't known from the log alone - 18 is the common default. A
        // token with different decimals will show an incorrectly-scaled amount here;
        // revisit by reading decimals() on log.address if this matters in practice.
        amount: formatUnits(BigInt(log.data), 18),
        txHash: log.transactionHash,
        fromAddress: getAddress(`0x${log.topics[1].slice(-40)}`),
        providerReference: `blockscan:${log.transactionHash}:${log.logIndex}`,
      });
    }

    return candidates;
  }

  // Native ETH transfers emit no logs, so this is the only way to catch them - fetch
  // every block in range with full transaction bodies and check each tx.to directly.
  private async scanNativeTransfers(
    walletByAddress: Map<string, WalletEntity>,
    chain: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<IDepositCandidate[]> {
    const candidates: IDepositCandidate[] = [];

    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      const block = await this.chainRpcClient.getBlockByNumber(
        `0x${blockNumber.toString(16)}`,
        true,
      );
      if (!block) {
        continue;
      }
      if (fromBlock == BigInt(50696239)) {
        // console.log("bloc",block)

      }
      // console.log("tx",block)
      for (const tx of block.transactions) {
        if (!tx.to || tx.value === '0x0') {
          continue;
        }
        const wallet = walletByAddress.get(tx.to.toLowerCase());
        if (fromBlock == BigInt(50696239) && tx.to.toLowerCase() == '0x55c176d4bb5fdb8fc893b8722c69d579f1e829d7') console.log("ashar", tx, wallet)

        if (!wallet) {
          continue;
        }

        console.log("afterr",candidates)
        try{
        candidates.push(
          {
          wallet,
          chain,
          asset: 'ETH',
          amount: formatUnits(BigInt(tx.value), 18),
          txHash: tx.hash,
          fromAddress: tx.from,
          providerReference: `blockscan:${tx.hash}:native`,
        }
      );
      }catch(err){
console.log("aaaaa",err)
      }
      }
    }
    console.log("canditat")
    return candidates;
  }

  private async recordAndNotify(candidate: IDepositCandidate): Promise<void> {
    const { wallet, ...data } = candidate;
    console.log("wallet, ...data", wallet, data)
    const deposit = await this.transactionService.recordDeposit({
      walletId: wallet.id,
      ...data,
    });

    if (!deposit) {
      return; // already recorded - overlapping ranges are handled defensively here
    }

    await this.notificationService.notify(
      wallet.userId,
      NotificationType.TRANSFER,
      'Funds received',
      `Received ${data.amount} ${data.asset} on chain ${data.chain}.`,
    );
  }
}