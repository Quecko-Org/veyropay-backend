import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LifiClient } from './lifi.client';
import { LifiService } from './lifi.service';
import { LifiHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [LifiClient, LifiService, LifiHealthService],
  exports: [LifiService, LifiHealthService],
})
export class LifiModule {}
