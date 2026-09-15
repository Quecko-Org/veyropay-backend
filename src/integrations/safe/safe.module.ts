import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { SafeClient } from './safe.client';
import { SafeService } from './safe.service';
import { SafeHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [ChainRpcClient, SafeClient, SafeService, SafeHealthService],
  exports: [SafeService, SafeHealthService],
})
export class SafeModule {}
