import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SumsubClient } from './sumsub.client';
import { SumsubService } from './sumsub.service';
import { SumsubHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [SumsubClient, SumsubService, SumsubHealthService],
  exports: [SumsubService, SumsubHealthService],
})
export class SumsubModule {}
