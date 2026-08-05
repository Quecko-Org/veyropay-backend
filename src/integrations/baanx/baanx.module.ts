import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BaanxClient } from './baanx.client';
import { BaanxService } from './baanx.service';
import { BaanxHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [BaanxClient, BaanxService, BaanxHealthService],
  exports: [BaanxService, BaanxHealthService],
})
export class BaanxModule {}
