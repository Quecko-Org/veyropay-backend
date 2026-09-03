import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SafeModule } from '@integrations/safe/safe.module';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { PimlicoClient } from './pimlico.client';
import { PimlicoService } from './pimlico.service';
import { PimlicoHealthService } from './health.service';
import { RelayerService } from './relayer.service';

@Module({
  imports: [TerminusModule, SafeModule],
  providers: [PimlicoClient, ChainRpcClient, PimlicoService, PimlicoHealthService, RelayerService],
  exports: [PimlicoService, PimlicoHealthService, RelayerService],
})
export class PimlicoModule {}
