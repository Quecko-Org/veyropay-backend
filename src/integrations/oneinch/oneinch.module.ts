import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { OneinchClient } from './oneinch.client';
import { OneinchService } from './oneinch.service';
import { OneinchHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [OneinchClient, OneinchService, OneinchHealthService],
  exports: [OneinchService, OneinchHealthService],
})
export class OneinchModule {}
